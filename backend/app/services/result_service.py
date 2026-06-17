from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.result import Result
from app.models.student import Student
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.schemas.result import ResultCreate, ResultUpdate
from app.core.exceptions import ResourceNotFoundException, ValidationException
from typing import List, Optional

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

async def create_result_batch(
    db: AsyncSession, 
    results_data: List[ResultCreate], 
    teacher_id: int
) -> List[Result]:
    """Create or update a batch of student results and set status to 'submitted'."""
    results = []
    for data in results_data:
        # Validate that student, subject and exam type exist
        student = await db.get(Student, data.student_id)
        if not student:
            raise ResourceNotFoundException("Student", str(data.student_id))
            
        subject = await db.get(Subject, data.subject_id)
        if not subject:
            raise ResourceNotFoundException("Subject", str(data.subject_id))
            
        exam_type = await db.get(ExamType, data.exam_type_id)
        if not exam_type:
            raise ResourceNotFoundException("ExamType", str(data.exam_type_id))

        percentage, grade = calculate_grade_and_percentage(data.marks_obtained, data.total_marks)
        
        # Check if result already exists for student, subject and exam type to update it
        stmt = select(Result).where(
            Result.student_id == data.student_id,
            Result.subject_id == data.subject_id,
            Result.exam_type_id == data.exam_type_id
        )
        existing_result = (await db.execute(stmt)).scalar_one_or_none()
        
        if existing_result:
            existing_result.marks_obtained = data.marks_obtained
            existing_result.total_marks = data.total_marks
            existing_result.percentage = percentage
            existing_result.grade = grade
            existing_result.status = "submitted"
            existing_result.submitted_by_id = teacher_id
            results.append(existing_result)
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
                submitted_by_id=teacher_id
            )
            db.add(db_result)
            results.append(db_result)
            
    await db.commit()
    
    # Reload with relationships
    final_results = []
    for r in results:
        stmt = select(Result).options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type)
        ).where(Result.id == r.id)
        res = (await db.execute(stmt)).scalar()
        final_results.append(res)
        
    return final_results

async def get_results_by_status(db: AsyncSession, status: Optional[str] = None) -> List[Result]:
    """Retrieve all results filtered by status, including nested relationships."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    )
    if status:
        stmt = stmt.where(Result.status == status)
        
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def approve_result(db: AsyncSession, result_id: int, admin_id: int, approved: bool) -> Result:
    """Approve or reject a submitted result."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    ).where(Result.id == result_id)
    
    db_result = (await db.execute(stmt)).scalar_one_or_none()
    if not db_result:
        raise ResourceNotFoundException("Result", str(result_id))
        
    if approved:
        db_result.status = "approved"
    else:
        db_result.status = "pending"  # sent back to pending
        
    db_result.approved_by_id = admin_id
    await db.commit()
    await db.refresh(db_result)
    return db_result
