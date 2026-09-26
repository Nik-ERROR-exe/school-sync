import asyncio
import logging
import secrets
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.teacher import Teacher
from app.core.security import get_password_hash
from app.core.ratelimit import limiter

# Import all API routers
from app.api.auth import router as auth_router
from app.api.admin_teachers import router as admin_teachers_router
from app.api.admin_exam_types import router as admin_exam_types_router
from app.api.admin_timetable import router as admin_timetable_router
from app.api.admin_results import router as admin_results_router
from app.api.admin_reports import router as admin_reports_router
from app.api.admin_substitute import router as admin_substitute_router
from app.api.teacher_results import router as teacher_results_router
from app.api.teacher_timetable import router as teacher_timetable_router
from app.api.admin_weekly_requirements import router as admin_weekly_requirements_router
from app.api.admin_subjects import router as admin_subjects_router
from app.api.admin_classes import router as admin_classes_router
from app.api.admin_students import router as admin_students_router
from app.api.admin_class_subjects import router as admin_class_subjects_router
from app.api.teacher_classes import router as teacher_classes_router
from app.api.teacher_students import router as teacher_students_router
from app.api.teacher_exam_types import router as teacher_exam_types_router
from app.api.public_timetable import router as public_timetable_router
from app.api.teacher_subject_list import router as teacher_subject_list_router
from app.api.admin_promotion import router as admin_promotion_router
from app.api.admin_subject_exam_components import router as admin_subject_exam_components_router
from app.api.ping import router as ping_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("uvicorn.error")


async def seed_initial_admin():
    """Seed admin account on startup with retries using AsyncSession."""
    max_retries = 3
    for attempt in range(max_retries):
        async with AsyncSessionLocal() as db:
            try:
                result = await db.execute(select(Teacher).where(Teacher.role == "ADMIN"))
                admin = result.scalars().first()
                if not admin:
                    initial_password = settings.INITIAL_ADMIN_PASSWORD or secrets.token_urlsafe(16)
                    hashed_pwd = get_password_hash(initial_password)
                    admin_teacher = Teacher(
                        teacher_id=settings.INITIAL_ADMIN_TEACHER_ID,
                        name=settings.INITIAL_ADMIN_NAME,
                        email=settings.INITIAL_ADMIN_EMAIL,
                        password_hash=hashed_pwd,
                        role="ADMIN",
                        status="ACTIVE",
                        max_lectures_per_day=0
                    )
                    db.add(admin_teacher)
                    await db.commit()
                    logger.info("Admin created: %s", settings.INITIAL_ADMIN_EMAIL)
                    if not settings.INITIAL_ADMIN_PASSWORD:
                        logger.warning("Initial admin password (save this now): %s", initial_password)
                else:
                    logger.info("Admin already exists")
                break
            except Exception as e:
                await db.rollback()
                if attempt < max_retries - 1:
                    logger.warning("DB not ready yet (attempt %d/%d), retrying in 3s...", attempt + 1, max_retries)
                    await asyncio.sleep(3)
                else:
                    logger.error("Seed error after %d attempts: %s", max_retries, e)


async def purge_old_substitute_assignments():
    """Automated data archival for the append-only substitute_assignments log using AsyncSession."""
    from app.services.substitute_service import purge_historical_substitute_assignments

    async with AsyncSessionLocal() as db:
        try:
            cutoff = datetime.strptime(settings.ACADEMIC_TERM_START, "%Y-%m-%d").date()
            deleted = await purge_historical_substitute_assignments(db, cutoff)
            logger.info("Archived substitute_assignments: purged %d row(s) older than %s.", deleted, settings.ACADEMIC_TERM_START)
        except Exception as e:
            await db.rollback()
            logger.warning("Substitute archival skipped: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI async lifespan managing application startup and shutdown tasks."""
    await seed_initial_admin()
    await purge_old_substitute_assignments()
    yield


app = FastAPI(
    title="SchoolSync Management System API",
    description="Backend services for Amarkor Vidyalaya School ERP",
    version="1.0.0",
    lifespan=lifespan,
)

# ============================================================
# CORS - restricted to the configured frontend origin(s)
# ============================================================
_app_origins = [o.strip() for o in settings.FRONTEND_ORIGIN.split(",") if o.strip()]
if not _app_origins:
    _app_origins = [
        "https://school-sync-fj5p.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_app_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Async Error Handling Middleware
# ============================================================
@app.middleware("http")
async def exception_handling_middleware(request: Request, call_next):
    """Asynchronous middleware capturing unhandled exceptions and returning
    standard JSON responses.
    """
    try:
        return await call_next(request)
    except HTTPException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )
    except Exception as exc:
        logger.exception("Unhandled server exception processing %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"},
        )


# ============================================================
# Security Headers Middleware
# ============================================================
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


# ============================================================
# Rate limiting (slowapi) - shared limiter + JSON 429 handler
# ============================================================
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )


# Register API routers
API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(admin_teachers_router, prefix=API_PREFIX)
app.include_router(admin_exam_types_router, prefix=API_PREFIX)
app.include_router(admin_timetable_router, prefix=API_PREFIX)
app.include_router(admin_results_router, prefix=API_PREFIX)
app.include_router(admin_reports_router, prefix=API_PREFIX)
app.include_router(admin_substitute_router, prefix=API_PREFIX)
app.include_router(teacher_results_router, prefix=API_PREFIX)
app.include_router(teacher_timetable_router, prefix=API_PREFIX)
app.include_router(admin_weekly_requirements_router, prefix=API_PREFIX)
app.include_router(admin_subjects_router, prefix=API_PREFIX)
app.include_router(admin_classes_router, prefix=API_PREFIX)
app.include_router(admin_students_router, prefix=API_PREFIX)
app.include_router(admin_class_subjects_router, prefix=API_PREFIX)
app.include_router(teacher_classes_router, prefix=API_PREFIX)
app.include_router(teacher_students_router, prefix=API_PREFIX)
app.include_router(teacher_exam_types_router, prefix=API_PREFIX)
app.include_router(public_timetable_router, prefix=API_PREFIX)
app.include_router(teacher_subject_list_router, prefix=API_PREFIX)
app.include_router(admin_promotion_router, prefix=API_PREFIX)
app.include_router(admin_subject_exam_components_router, prefix=API_PREFIX)
app.include_router(ping_router, prefix=API_PREFIX)


@app.get("/")
async def root_status():
    return {
        "app": "Amarkor Vidyalaya SchoolSync API",
        "status": "active",
        "version": "1.0.0",
        "docs_url": "/docs"
    }