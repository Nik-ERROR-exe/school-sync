from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.result import ResultResponse, ResultApproval
from app.services.result_service import get_results_by_status, approve_result
from app.models.teacher import Teacher

router = APIRouter(
    prefix="/admin/results",
    tags=["Admin - Student Results"],
    dependencies=[Depends(require_admin)]
)

@router.get("/", response_model=List[ResultResponse])
async def list_results(
    status: Optional[str] = Query(None, description="Filter results by status ('pending', 'submitted', 'approved')"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves all student results. Can filter results by status.
    """
    results = await get_results_by_status(db, status)
    
    # Flatten database models to match the response schema
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

@router.put("/{id}/approve", response_model=ResultResponse)
async def approve_student_result(
    id: int,
    approval: ResultApproval,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Approves or rejects a submitted student result record.
    """
    r = await approve_result(db, id, current_admin.id, approval.approved)
    
    return ResultResponse(
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
