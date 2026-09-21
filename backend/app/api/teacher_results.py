from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.result import Result
from app.schemas.result import ResultBatchCreate, ResultResponse
from app.services.result_service import create_result_batch

router = APIRouter(prefix="/teacher/results", tags=["Teacher - Results"])

@router.post("/", response_model=List[ResultResponse], status_code=status.HTTP_201_CREATED)
def submit_student_results(
    req: ResultBatchCreate,
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits or updates a batch of student exam marks. Results are initialized with 'submitted' status.
    """
    results = create_result_batch(db, req.results, current_user.id)
    
    # Map raw models to response list
    response_data = []
    for r in results:
        response_data.append(
            ResultResponse(
                id=r.id,
                student_id=r.student_id,
                student_roll_no=r.student.roll_no if r.student else None,
                student_name=r.student.name if r.student else None,
                student_class=r.student.school_class.class_name if r.student and r.student.school_class else None,
                student_division=r.student.school_class.division if r.student and r.student.school_class else None,
                subject_id=r.subject_id,
                subject_name=r.subject.subject_name if r.subject else None,
                subject_code=r.subject.code if r.subject else None,
                exam_type_id=r.exam_type_id,
                exam_type_name=r.exam_type.name if r.exam_type else None,
                marks_obtained=r.marks_obtained,
                total_marks=r.total_marks,
                percentage=r.percentage,
                grade=r.grade,
                status=r.status,
                submitted_by_id=r.submitted_by_id,
                approved_by_id=r.approved_by_id
            )
        )
    return response_data


@router.get("/class/{class_id}/exam/{exam_type_id}")
def get_teacher_results_by_class_and_exam(
    class_id: int,
    exam_type_id: int,
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns existing marks as a dictionary { "studentId_subjectId": marks_obtained, ... }
    """
    results_stmt = (
        db.query(Result)
        .join(Student, Result.student_id == Student.id)
        .filter(
            Student.class_id == class_id,
            Result.exam_type_id == exam_type_id,
        )
    )
    results = results_stmt.all()
    marks_map = {}
    for r in results:
        marks_map[f"{r.student_id}_{r.subject_id}"] = r.marks_obtained
    return marks_map
