from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import SessionLocal
from app.models.teacher import Teacher
from app.core.security import get_password_hash

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
from app.api.admin_students import router as admin_students_router

# Import new API routers
from app.api.admin_students import router as admin_students_router
from app.api.admin_class_subjects import router as admin_class_subjects_router
from app.api.teacher_students import router as teacher_students_router
from app.api.teacher_classes import router as teacher_classes_router
from app.api.admin_classes import router as admin_classes_router
from app.api.teacher_exam_types import router as teacher_exam_types_router
from app.api.teacher_subjects import router as teacher_subjects_router
from app.api.admin_subjects import router as admin_subjects_router



app = FastAPI(
    title="SchoolSync Management System API",
    description="Backend services for Amarkor Vidyalaya School ERP",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(teachers_router, prefix=API_PREFIX)
app.include_router(exam_types_router, prefix=API_PREFIX)
app.include_router(timetable_router, prefix=API_PREFIX)
app.include_router(admin_results_router, prefix=API_PREFIX)
app.include_router(reports_router, prefix=API_PREFIX)
app.include_router(sub_router, prefix=API_PREFIX)
app.include_router(teacher_results_router, prefix=API_PREFIX)
app.include_router(teacher_timetable_router, prefix=API_PREFIX)
app.include_router(notifications_router, prefix=API_PREFIX)
app.include_router(weekly_req_router, prefix=API_PREFIX)
app.include_router(admin_students_router, prefix=API_PREFIX)

# Register new API routers
app.include_router(admin_students_router, prefix=API_PREFIX)
app.include_router(admin_class_subjects_router, prefix=API_PREFIX)
app.include_router(teacher_students_router, prefix=API_PREFIX)
app.include_router(teacher_classes_router, prefix=API_PREFIX)
app.include_router(admin_classes_router, prefix=API_PREFIX)
app.include_router(teacher_exam_types_router, prefix=API_PREFIX)
app.include_router(teacher_subjects_router, prefix=API_PREFIX)
app.include_router(admin_subjects_router, prefix=API_PREFIX)

@app.on_event("startup")
def seed_initial_admin():
    """Seed admin account on startup."""
    db = SessionLocal()
    try:
        admin = db.query(Teacher).filter(Teacher.role == "ADMIN").first()
        if not admin:
            hashed_pwd = get_password_hash(settings.INITIAL_ADMIN_PASSWORD)
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
            print(f"✅ Admin created: {settings.INITIAL_ADMIN_EMAIL}")
        else:
            print("✅ Admin already exists")
    except Exception as e:
        db.rollback()
        print(f"❌ Seed error: {str(e)}")
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