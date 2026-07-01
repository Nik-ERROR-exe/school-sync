from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.result import Result

router = APIRouter(prefix="/teacher/students", tags=["Teacher - Students"])

@router.get("/by-class/{class_id}")
def get_students_by_class(
    class_id: int,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all students and their subjects for a class"""
    
    # Get students
    students = db.query(Student).filter(Student.class_id == class_id).order_by(Student.roll_no).all()
    
    # Get subjects for this class
    subjects = db.query(Subject).join(
        TeacherClassSubject, TeacherClassSubject.subject_id == Subject.id
    ).filter(
        TeacherClassSubject.class_id == class_id
    ).order_by(Subject.subject_name).all()
    
    return {
        "students": students,
        "subjects": subjects
    }


# ============================================================
# NEW ENDPOINT: Get results for a class and exam (for teacher)
# ============================================================
@router.get("/results/class/{class_id}/exam/{exam_type_id}")
def get_student_results_by_class_and_exam(
    class_id: int,
    exam_type_id: int,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get existing results for a class and exam type.
    Returns marks as {student_id: marks_obtained} for auto-loading.
    """
    results = db.query(Result).filter(
        Result.class_id == class_id,
        Result.exam_type_id == exam_type_id
    ).all()
    
    marks_dict = {}
    for result in results:
        marks_dict[result.student_id] = result.marks_obtained
    
    return marks_dict