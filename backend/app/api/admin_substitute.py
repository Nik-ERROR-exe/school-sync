from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date as pydate
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.substitute import SubstituteAssignRequest, SubstituteAssignmentResponse
from app.services.substitute_service import find_available_substitutes, assign_substitute
from app.core.exceptions import ValidationException

router = APIRouter(
    prefix="/admin/substitute",
    tags=["Admin - Substitute Management"],
    dependencies=[Depends(require_admin)]
)

@router.get("/available")
async def get_available_substitutes(
    date: pydate = Query(..., description="Date of the scheduled class absence"),
    period_number: int = Query(..., ge=1, description="Period slot number"),
    absent_teacher_id: int = Query(..., description="Database ID of the absent teacher"),
    db: AsyncSession = Depends(get_db)
):
    """
    Checks the master schedule to determine which class is affected by the teacher's absence,
    and returns a list of available substitute teachers.
    """
    slot, available_teachers = await find_available_substitutes(
        db, date, period_number, absent_teacher_id
    )
    
    if not slot:
        raise ValidationException("The absent teacher does not have any scheduled class during this period.")
        
    return {
        "class_id": slot.class_id,
        "class_name": slot.school_class.class_name,
        "division": slot.school_class.division,
        "subject_id": slot.subject_id,
        "subject_name": slot.subject.subject_name if slot.subject else None,
        "available_teachers": available_teachers
    }

@router.post("/", response_model=SubstituteAssignmentResponse)
async def create_substitute_assignment(
    req: SubstituteAssignRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Assigns a substitute teacher for a specific date and period, leaving the original timetable intact
    and sending an alert notification to the substitute.
    """
    assignment = await assign_substitute(
        db=db,
        date=req.date,
        period_number=req.period_number,
        class_id=req.class_id,
        original_teacher_id=req.original_teacher_id,
        substitute_teacher_id=req.substitute_teacher_id,
        background_tasks=background_tasks
    )
    
    return SubstituteAssignmentResponse(
        id=assignment.id,
        date=assignment.date,
        period_number=assignment.period_number,
        class_id=assignment.class_id,
        class_name=assignment.school_class.class_name,
        division=assignment.school_class.division,
        original_teacher_id=assignment.original_teacher_id,
        original_teacher_name=assignment.original_teacher.name,
        substitute_teacher_id=assignment.substitute_teacher_id,
        substitute_teacher_name=assignment.substitute_teacher.name,
        status=assignment.status
    )
