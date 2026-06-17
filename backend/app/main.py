from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.teacher import Teacher
from app.core.security import get_password_hash
from sqlalchemy.future import select

# Import all API routers
from app.api.auth import router as auth_router
from app.api.admin_teachers import router as teachers_router
from app.api.admin_exam_types import router as exam_types_router
from app.api.admin_timetable import router as timetable_router
from app.api.admin_results import router as admin_results_router
from app.api.admin_reports import router as reports_router
from app.api.admin_substitute import router as sub_router
from app.api.teacher_results import router as teacher_results_router
from app.api.teacher_timetable import router as teacher_timetable_router
from app.api.notifications import router as notifications_router
from app.api.admin_weekly_requirements import router as weekly_req_router

app = FastAPI(
    title="SchoolSync Management System API",
    description="Backend services for results management, timetable generation, and substitute mapping.",
    version="1.0.0"
)

# CORS configurations - Credentials enabled for HttpOnly Cookies security flow
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers under /api namespace
app.include_router(auth_router, prefix="/api")
app.include_router(teachers_router, prefix="/api")
app.include_router(exam_types_router, prefix="/api")
app.include_router(timetable_router, prefix="/api")
app.include_router(admin_results_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(sub_router, prefix="/api")
app.include_router(teacher_results_router, prefix="/api")
app.include_router(teacher_timetable_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(weekly_req_router, prefix="/api")

@app.on_event("startup")
async def seed_initial_admin():
    """
    On application startup, checks if any administrator account exists in the database.
    If none are found, it seeds the initial administrator using the environment settings.
    """
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Teacher).where(Teacher.role == "ADMIN")
            res = await session.execute(stmt)
            admin_exists = res.scalars().first() is not None
            
            if not admin_exists:
                hashed_pwd = get_password_hash(settings.INITIAL_ADMIN_PASSWORD)
                admin_teacher = Teacher(
                    teacher_id=settings.INITIAL_ADMIN_TEACHER_ID,
                    name=settings.INITIAL_ADMIN_NAME,
                    email=settings.INITIAL_ADMIN_EMAIL,
                    password_hash=hashed_pwd,
                    role="ADMIN",
                    status="ACTIVE",
                    max_lectures_per_day=0  # Admin doesn't have lecture duties
                )
                session.add(admin_teacher)
                await session.commit()
                print(f"Seed: Admin account created successfully. Username: {settings.INITIAL_ADMIN_TEACHER_ID}")
        except Exception as e:
            await session.rollback()
            print(f"Seed error: Failed to check/seed admin: {str(e)}")

@app.get("/")
async def root_status():
    return {
        "app": "SchoolSync API",
        "status": "active",
        "docs_url": "/docs"
    }
