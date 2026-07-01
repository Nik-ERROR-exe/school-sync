from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher_class_subject import TeacherClassSubject

router = APIRouter(prefix="/teacher/students", tags=["Teacher - Students"])

@router.get("/by-class/{class_id}")
def get_students_by_class(
    class_id: int,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get students and subjects for a class (no teacher filter)"""
    
    # Get students
    students = db.query(Student).filter(Student.class_id == class_id).order_by(Student.roll_no).all()
    
    # Get ALL subjects for this class (from class_subjects mapping)
    subjects = db.query(Subject).join(
        TeacherClassSubject, TeacherClassSubject.subject_id == Subject.id
    ).filter(
        TeacherClassSubject.class_id == class_id
    ).order_by(Subject.subject_name).all()
    
    return {
        "students": students,
        "subjects": subjects
    }