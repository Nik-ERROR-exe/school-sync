from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from datetime import date as pydate
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.timetable import TimetableSlot
from app.models.substitute_assignment import SubstituteAssignment
from app.schemas.timetable import TimetableSlotResponse
from app.schemas.substitute import SubstituteAssignmentResponse

router = APIRouter(
    prefix="/teacher/timetable",
    tags=["Teacher - Timetable"]
)

@router.get("/master", response_model=List[TimetableSlotResponse])
async def get_master_timetable(
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the master recurring schedule slots assigned to the logged-in teacher.
    """
    stmt = select(TimetableSlot).where(
        TimetableSlot.teacher_id == current_user.id
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())

@router.get("/substitutions", response_model=List[SubstituteAssignmentResponse])
async def get_substitute_assignments(
    date: Optional[pydate] = Query(None, description="Optional date filter"),
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves all substitution covering assignments assigned to the logged-in teacher.
    """
    stmt = select(SubstituteAssignment).options(
        joinedload(SubstituteAssignment.school_class),
        joinedload(SubstituteAssignment.original_teacher),
        joinedload(SubstituteAssignment.substitute_teacher)
    ).where(
        SubstituteAssignment.substitute_teacher_id == current_user.id
    )
    
    if date:
        stmt = stmt.where(SubstituteAssignment.date == date)
        
    res = await db.execute(stmt)
    assignments = res.scalars().all()
    
    response_data = []
    for a in assignments:
        response_data.append(
            SubstituteAssignmentResponse(
                id=a.id,
                date=a.date,
                period_number=a.period_number,
                class_id=a.class_id,
                class_name=a.school_class.class_name,
                division=a.school_class.division,
                original_teacher_id=a.original_teacher_id,
                original_teacher_name=a.original_teacher.name,
                substitute_teacher_id=a.substitute_teacher_id,
                substitute_teacher_name=a.substitute_teacher.name,
                status=a.status
            )
        )
    return response_data
