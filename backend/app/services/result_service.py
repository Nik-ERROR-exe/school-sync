from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.result import Result
from app.models.student import Student
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.schemas.result import ResultCreate
from app.core.exceptions import ResourceNotFoundException, ValidationException

def calculate_grade_and_percentage(marks_obtained: float, total_marks: float) -> tuple[float, str]:
    """Helper function to calculate percentage and assign grades based on marks."""
    if total_marks <= 0:
        raise ValidationException("Total marks must be greater than zero.")
    if marks_obtained > total_marks:
        raise ValidationException("Marks obtained cannot exceed total marks.")
        
    percentage = (marks_obtained / total_marks) * 100
    percentage = round(percentage, 2)
    
    if percentage >= 90:
        grade = "A+"
    elif percentage >= 80:
        grade = "A"
    elif percentage >= 70:
        grade = "B"
    elif percentage >= 60:
        grade = "C"
    elif percentage >= 50:
        grade = "D"
    elif percentage >= 40:
        grade = "E"
    else:
        grade = "F"
        
    return percentage, grade

def create_result_batch(
    db: Session, 
    results_data: List[ResultCreate], 
    teacher_id: int
) -> List[Result]:
    """Create or update a batch of student results and set status to 'submitted'."""
    results = []
    for data in results_data:
        # Validate that student, subject and exam type exist
        student = db.query(Student).filter(Student.id == data.student_id).first()
        if not student:
            raise ResourceNotFoundException("Student", str(data.student_id))
            
        subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
        if not subject:
            raise ResourceNotFoundException("Subject", str(data.subject_id))
            
        exam_type = db.query(ExamType).filter(ExamType.id == data.exam_type_id).first()
        if not exam_type:
            raise ResourceNotFoundException("ExamType", str(data.exam_type_id))

        percentage, grade = calculate_grade_and_percentage(data.marks_obtained, data.total_marks)
        
        # Check if result already exists
        existing = db.query(Result).filter(
            Result.student_id == data.student_id,
            Result.subject_id == data.subject_id,
            Result.exam_type_id == data.exam_type_id
        ).first()
        
        if existing:
            existing.marks_obtained = data.marks_obtained
            existing.total_marks = data.total_marks
            existing.percentage = percentage
            existing.grade = grade
            existing.status = "submitted"
            existing.submitted_by_id = teacher_id
            existing.submitted_at = datetime.utcnow()
            results.append(existing)
        else:
            db_result = Result(
                student_id=data.student_id,
                subject_id=data.subject_id,
                exam_type_id=data.exam_type_id,
                marks_obtained=data.marks_obtained,
                total_marks=data.total_marks,
                percentage=percentage,
                grade=grade,
                status="submitted",
                submitted_by_id=teacher_id,
                submitted_at=datetime.utcnow()
            )
            db.add(db_result)
            results.append(db_result)
            
    db.commit()
    
    # Refresh all results
    for r in results:
        db.refresh(r)
        
    return results

def get_results_by_status(db: Session, status: Optional[str] = None) -> List[Result]:
    """Retrieve all results filtered by status."""
    query = db.query(Result)
    if status:
        query = query.filter(Result.status == status)
    return query.all()

def approve_result(db: Session, result_id: int, admin_id: int, approved: bool) -> Result:
    """Approve or reject a submitted result."""
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise ResourceNotFoundException("Result", str(result_id))
        
    if approved:
        result.status = "approved"
    else:
        result.status = "rejected"
        
    result.approved_by_id = admin_id
    result.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(result)
    return result

def update_result(db: Session, result_id: int, marks_obtained: float, total_marks: float) -> Result:
    """Update a result (for admin auto-save)."""
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise ResourceNotFoundException("Result", str(result_id))
    
    result.marks_obtained = marks_obtained
    result.total_marks = total_marks
    
    # Recalculate percentage and grade
    if result.total_marks > 0:
        result.percentage = (result.marks_obtained / result.total_marks) * 100
        p = result.percentage
        if p >= 90: result.grade = "A+"
        elif p >= 80: result.grade = "A"
        elif p >= 70: result.grade = "B"
        elif p >= 60: result.grade = "C"
        elif p >= 50: result.grade = "D"
        elif p >= 40: result.grade = "E"
        else: result.grade = "F"
    
    db.commit()
    db.refresh(result)
    return result