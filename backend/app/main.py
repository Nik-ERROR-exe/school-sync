from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
import secrets
import time
from app.config import settings
from app.database import SessionLocal
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
# from app.api.admin_class_subjects import router as admin_class_subjects_router
from app.api.teacher_classes import router as teacher_classes_router
from app.api.teacher_students import router as teacher_students_router
from app.api.teacher_exam_types import router as teacher_exam_types_router
from app.api.public_timetable import router as public_timetable_router
from app.api.teacher_subject_list import router as teacher_subject_list_router
from app.api.admin_promotion import router as admin_promotion_router
from app.api.ping import router as ping_router  




app = FastAPI(
    title="SchoolSync Management System API",
    description="Backend services for Amarkor Vidyalaya School ERP",
    version="1.0.0"
)

# ============================================================
# CORS - restricted to the configured frontend origin(s)
# ============================================================
_app_origins = [o.strip() for o in settings.FRONTEND_ORIGIN.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        
        "https://school-sync-fj5p.vercel.app",  # remove once you delete the duplicate
        "http://localhost:5173",  # your local dev frontend, adjust port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
# app.include_router(admin_class_subjects_router, prefix=API_PREFIX)
app.include_router(teacher_classes_router, prefix=API_PREFIX)
app.include_router(teacher_students_router, prefix=API_PREFIX)
app.include_router(teacher_exam_types_router, prefix=API_PREFIX)
app.include_router(public_timetable_router, prefix=API_PREFIX)
app.include_router(teacher_subject_list_router, prefix=API_PREFIX)
app.include_router(admin_promotion_router, prefix=API_PREFIX)
app.include_router(ping_router, prefix=API_PREFIX)


@app.on_event("startup")
def seed_initial_admin():
    """Seed admin account on startup with retries."""
    max_retries = 3
    for attempt in range(max_retries):
        db = SessionLocal()
        try:
            admin = db.query(Teacher).filter(Teacher.role == "ADMIN").first()
            if not admin:
                # Never seed a predictable password: auto-generate a strong one
                # when INITIAL_ADMIN_PASSWORD is unset, and print it ONCE so the
                # deployer can save it. It is only stored as a bcrypt hash.
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
                db.commit()
                print(f"[OK] Admin created: {settings.INITIAL_ADMIN_EMAIL}")
                if not settings.INITIAL_ADMIN_PASSWORD:
                    print(f"[OK] Initial admin password (save this now): {initial_password}")
            else:
                print("[OK] Admin already exists")
            break
        except Exception as e:
            db.rollback()
            if attempt < max_retries - 1:
                print(f"[WARN] DB not ready yet (attempt {attempt + 1}/{max_retries}), retrying in 3s...")
                time.sleep(3)
            else:
                print(f"[ERROR] Seed error after {max_retries} attempts: {e}")
        finally:
            db.close()

    # Data archival: purge substitute assignments older than the current academic term.
    purge_old_substitute_assignments()


def purge_old_substitute_assignments():
    """Automated data archival for the append-only substitute_assignments log."""
    from datetime import datetime
    from app.services.substitute_service import purge_historical_substitute_assignments

    db = SessionLocal()
    try:
        cutoff = datetime.strptime(settings.ACADEMIC_TERM_START, "%Y-%m-%d").date()
        deleted = purge_historical_substitute_assignments(db, cutoff)
        print(f"[OK] Archived substitute_assignments: purged {deleted} row(s) older than {settings.ACADEMIC_TERM_START}.")
    except Exception as e:
        db.rollback()
        print(f"[WARN] Substitute archival skipped: {e}")
    finally:
        db.close()

@app.get("/")
async def root_status():
    return {
        "app": "Amarkor Vidyalaya SchoolSync API",
        "status": "active",
        "version": "1.0.0",
        "docs_url": "/docs"
    }