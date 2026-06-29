from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.result import Result
from app.models.teacher_class_subject import TeacherClassSubject

router = APIRouter(prefix="/teacher/results", tags=["Teacher - Results"])

def calculate_grade(percentage: float) -> str:
    if percentage >= 90: return "A+"
    elif percentage >= 80: return "A"
    elif percentage >= 70: return "B"
    elif percentage >= 60: return "C"
    elif percentage >= 50: return "D"
    else: return "F"

@router.post("/submit")
def submit_results(
    data: dict,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit marks for multiple subjects and students
    """
    class_id = data.get("class_id")
    exam_type_id = data.get("exam_type_id")
    total_marks = data.get("total_marks", 100)
    marks_data = data.get("marks", [])  # List of {student_id, subject_id, marks_obtained}
    
    if not class_id or not exam_type_id:
        raise HTTPException(status_code=400, detail="Class ID and Exam Type are required")
    
    if not marks_data:
        raise HTTPException(status_code=400, detail="No marks data provided")
    
    for mark in marks_data:
        student_id = mark.get("student_id")
        subject_id = mark.get("subject_id")
        marks_obtained = mark.get("marks_obtained", 0)
        
        # Calculate percentage and grade
        percentage = (marks_obtained / total_marks) * 100
        grade = calculate_grade(percentage)
        
        # Check if result already exists
        existing = db.query(Result).filter(
            Result.student_id == student_id,
            Result.subject_id == subject_id,
            Result.exam_type_id == exam_type_id
        ).first()
        
        if existing:
            existing.marks_obtained = marks_obtained
            existing.total_marks = total_marks
            existing.percentage = percentage
            existing.grade = grade
            existing.status = "submitted"
            existing.submitted_by_id = current_teacher.id
            existing.submitted_at = datetime.utcnow()
        else:
            new_result = Result(
                student_id=student_id,
                subject_id=subject_id,
                exam_type_id=exam_type_id,
                marks_obtained=marks_obtained,
                total_marks=total_marks,
                percentage=percentage,
                grade=grade,
                status="submitted",
                submitted_by_id=current_teacher.id,
                submitted_at=datetime.utcnow()
            )
            db.add(new_result)
    
    db.commit()
    return {"message": "Results submitted successfully"}