from fastapi import APIRouter, Depends
from sqlalchemy import cast, Integer, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher_class_subject import TeacherClassSubject

router = APIRouter(prefix="/teacher/students", tags=["Teacher - Students"])

@router.get("/by-class/{class_id}")
async def get_students_by_class(
    class_id: int,
    current_teacher: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get students and subjects for a class (no teacher filter)"""
    
    # Get students
    students_res = await db.execute(
        select(Student).where(Student.class_id == class_id).order_by(cast(Student.roll_no, Integer))
    )
    students = students_res.scalars().all()
    
    # Get ALL subjects for this class (from class_subjects mapping)
    subjects_res = await db.execute(
        select(Subject).join(
            TeacherClassSubject, TeacherClassSubject.subject_id == Subject.id
        ).where(
            TeacherClassSubject.class_id == class_id
        ).order_by(Subject.subject_name)
    )
    subjects = subjects_res.scalars().all()
    
    return {
        "students": students,
        "subjects": subjects
    }