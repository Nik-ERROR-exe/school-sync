from sqlalchemy.orm import Session, joinedload
from sqlalchemy.future import select
from app.models.result import Result
from app.models.student import Student
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.schemas.result import ResultCreate, MIN_MARKS, MAX_MARKS
from app.core.exceptions import ResourceNotFoundException, ValidationException
from typing import List, Optional
from datetime import datetime

def calculate_grade_and_percentage(marks_obtained: float, total_marks: float) -> tuple[float, str]:
    """Helper function to calculate percentage and assign grades based on marks."""
    if total_marks < MIN_MARKS:
        raise ValidationException(f"Total marks must be at least {MIN_MARKS}.")
    if total_marks > MAX_MARKS:
        raise ValidationException(f"Total marks cannot exceed {MAX_MARKS}.")
    if marks_obtained < MIN_MARKS:
        raise ValidationException(f"Marks obtained must be at least {MIN_MARKS}.")
    if marks_obtained > MAX_MARKS:
        raise ValidationException(f"Marks obtained cannot exceed {MAX_MARKS}.")
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
    if not results_data:
        return []

    # 1. Bulk validate existence of Students, Subjects, and ExamTypes
    student_ids = {data.student_id for data in results_data}
    subject_ids = {data.subject_id for data in results_data}
    exam_type_ids = {data.exam_type_id for data in results_data}

    found_student_ids = set(db.scalars(select(Student.id).where(Student.id.in_(student_ids))).all())
    missing_students = student_ids - found_student_ids
    if missing_students:
        raise ResourceNotFoundException("Student", str(next(iter(missing_students))))

    found_subject_ids = set(db.scalars(select(Subject.id).where(Subject.id.in_(subject_ids))).all())
    missing_subjects = subject_ids - found_subject_ids
    if missing_subjects:
        raise ResourceNotFoundException("Subject", str(next(iter(missing_subjects))))

    found_exam_type_ids = set(db.scalars(select(ExamType.id).where(ExamType.id.in_(exam_type_ids))).all())
    missing_exam_types = exam_type_ids - found_exam_type_ids
    if missing_exam_types:
        raise ResourceNotFoundException("ExamType", str(next(iter(missing_exam_types))))

    # 2. Bulk fetch existing results matching the batch criteria
    existing_results = db.scalars(
        select(Result).where(
            Result.student_id.in_(student_ids),
            Result.subject_id.in_(subject_ids),
            Result.exam_type_id.in_(exam_type_ids)
        )
    ).all()
    existing_map = {(r.student_id, r.subject_id, r.exam_type_id): r for r in existing_results}

    # 3. Create or update result records in memory
    results = []
    now = datetime.utcnow()
    for data in results_data:
        percentage, grade = calculate_grade_and_percentage(data.marks_obtained, data.total_marks)
        key = (data.student_id, data.subject_id, data.exam_type_id)
        existing = existing_map.get(key)
        
        if existing:
            existing.marks_obtained = data.marks_obtained
            existing.total_marks = data.total_marks
            existing.percentage = percentage
            existing.grade = grade
            existing.status = "submitted"
            existing.submitted_by_id = teacher_id
            existing.submitted_at = now
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
                submitted_at=now
            )
            db.add(db_result)
            results.append(db_result)

    db.commit()

    # 4. Fetch all refreshed results with joined relationships in a single bulk query
    result_ids = [r.id for r in results]
    final_results = db.scalars(
        select(Result).options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type)
        ).where(Result.id.in_(result_ids))
    ).unique().all()

    return list(final_results)

def get_results_by_status(db: Session, status: Optional[str] = None) -> List[Result]:
    """Retrieve all results filtered by status, including nested relationships."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    )
    if status:
        stmt = stmt.where(Result.status == status)
        
    result = db.execute(stmt)
    return list(result.scalars().all())

def approve_result(db: Session, result_id: int, admin_id: int, approved: bool) -> Result:
    """Approve or reject a submitted result."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    ).where(Result.id == result_id)
    
    db_result = db.execute(stmt).scalar_one_or_none()
    if not db_result:
        raise ResourceNotFoundException("Result", str(result_id))
        
    if approved:
        db_result.status = "approved"
    else:
        db_result.status = "rejected"
        
    db_result.approved_by_id = admin_id
    db_result.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(db_result)
    return db_result

def update_result(db: Session, result_id: int, data: dict) -> Result:
    """Update an existing result (admin override)."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    ).where(Result.id == result_id)
    
    db_result = db.execute(stmt).scalar_one_or_none()
    if not db_result:
        raise ResourceNotFoundException("Result", str(result_id))
    
    # Update fields
    if 'marks_obtained' in data:
        db_result.marks_obtained = data['marks_obtained']
        percentage, grade = calculate_grade_and_percentage(
            db_result.marks_obtained, 
            db_result.total_marks
        )
        db_result.percentage = percentage
        db_result.grade = grade
    
    if 'total_marks' in data:
        db_result.total_marks = data['total_marks']
        percentage, grade = calculate_grade_and_percentage(
            db_result.marks_obtained, 
            db_result.total_marks
        )
        db_result.percentage = percentage
        db_result.grade = grade
    
    if 'status' in data:
        db_result.status = data['status']
    
    db.commit()
    db.refresh(db_result)
    return db_result