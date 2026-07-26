from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import date as pydate
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.substitute import (
    SubstituteAssignRequest,
    SubstituteAssignBatchRequest,
    SubstituteAssignmentResponse,
    AffectedPeriodResponse,
    AvailableTeacherResponse,
    TeacherListResponse,
    FutureSubstituteAssignRequest,
    FutureSubstituteBatchRequest,
)
from app.services.substitute_service import (
    find_available_substitutes,
    assign_substitute,
    get_affected_periods,
    get_all_assignments,
    get_active_teachers,
    assign_substitutes_batch,
    get_future_affected_periods,
    find_available_teachers_for_slot,
    assign_future_substitutes,
)
from app.core.exceptions import ValidationException

router = APIRouter(
    prefix="/admin/substitute",
    tags=["Admin - Substitute Management"],
    dependencies=[Depends(require_admin)]
)


@router.get("/", response_model=List[SubstituteAssignmentResponse])
def list_substitute_assignments(
    db: Session = Depends(get_db)
):
    """Returns all substitute assignments (history log)."""
    return get_all_assignments(db)


@router.get("/affected-periods", response_model=List[AffectedPeriodResponse])
def get_absent_teacher_affected_periods(
    day_of_week: str = Query(..., description="Day of week (e.g. Monday)"),
    absent_teacher_id: int = Query(..., description="Database ID of the absent teacher"),
    db: Session = Depends(get_db)
):
    """
    Returns all timetable slots for the absent teacher on the given day_of_week.
    Returns recurring slots (no specific date), excluding slots that already
    have a substitute assignment (pending/notified/accepted) for that day/period.
    """
    periods = get_future_affected_periods(db, absent_teacher_id, day_of_week)
    if not periods:
        raise ValidationException(
            f"The absent teacher has no scheduled classes on {day_of_week}, or all slots already have substitutes assigned."
        )
    return periods


@router.get("/available", response_model=dict)
def get_available_substitutes(
    date: pydate = Query(..., description="Date of the scheduled class absence"),
    period_number: int = Query(..., ge=1, description="Period slot number"),
    absent_teacher_id: int = Query(..., description="Database ID of the absent teacher"),
    db: Session = Depends(get_db)
):
    """
    Checks the master schedule to determine which class is affected by the teacher's absence,
    and returns a list of available substitute teachers for that specific period.
    """
    slot, available_teachers = find_available_substitutes(
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


@router.get("/available-teachers")
def get_available_teachers_for_future_slot(
    class_id: int = Query(..., description="Class ID"),
    day_of_week: str = Query(..., description="Day of week (e.g. Monday)"),
    period: int = Query(..., ge=1, description="Period slot number"),
    subject_id: int = Query(..., description="Subject ID for expertise matching"),
    exclude_teacher_id: int = Query(..., description="Teacher ID to exclude (the absent teacher)"),
    db: Session = Depends(get_db)
):
    """
    Returns available teachers who are not already occupied in the given slot
    (day_of_week + period), optionally ordered by expertise match.
    Used for the future-slot substitution workflow (no specific date).
    """
    teachers = find_available_teachers_for_slot(
        db,
        class_id=class_id,
        day_of_week=day_of_week,
        period_number=period,
        subject_id=subject_id,
        exclude_teacher_id=exclude_teacher_id,
    )
    return {
        "class_id": class_id,
        "day_of_week": day_of_week,
        "period_number": period,
        "subject_id": subject_id,
        "available_teachers": teachers
    }


@router.post("/", response_model=SubstituteAssignmentResponse)
def create_substitute_assignment(
    req: SubstituteAssignRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Assigns a substitute teacher for a specific date and period, leaving the original timetable intact
    and sending an alert notification to the substitute.
    """
    assignment = assign_substitute(
        db=db,
        date=req.date,
        period_number=req.period_number,
        class_id=req.class_id,
        subject_id=req.subject_id,
        original_teacher_id=req.original_teacher_id,
        substitute_teacher_id=req.substitute_teacher_id,
        background_tasks=background_tasks
    )

    return SubstituteAssignmentResponse(
        id=assignment.id,
        date=assignment.date,
        day_of_week=assignment.day_of_week,
        period_number=assignment.period_number,
        class_id=assignment.class_id,
        subject_id=assignment.subject_id,
        class_name=assignment.school_class.class_name,
        division=assignment.school_class.division,
        subject_name=assignment.subject.subject_name if assignment.subject else None,
        original_teacher_id=assignment.original_teacher_id,
        original_teacher_name=assignment.original_teacher.name,
        substitute_teacher_id=assignment.substitute_teacher_id,
        substitute_teacher_name=assignment.substitute_teacher.name,
        status=assignment.status
    )


@router.post("/assign", response_model=List[SubstituteAssignmentResponse])
def assign_future_substitutes_batch(
    req: FutureSubstituteBatchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Batch-assigns substitute teachers for multiple future timetable slots.
    Body: { original_teacher_id, assignments: [{ class_id, subject_id, day_of_week, period_number, substitute_teacher_id }] }
    Validates no conflicts, saves to substitute_assignments, creates notifications.
    """
    created = assign_future_substitutes(
        db=db,
        original_teacher_id=req.original_teacher_id,
        assignments=req.assignments,
        background_tasks=background_tasks
    )

    return [
        SubstituteAssignmentResponse(
            id=a.id,
            date=a.date,
            day_of_week=a.day_of_week,
            period_number=a.period_number,
            class_id=a.class_id,
            subject_id=a.subject_id,
            class_name=a.school_class.class_name,
            division=a.school_class.division,
            subject_name=a.subject.subject_name if a.subject else None,
            original_teacher_id=a.original_teacher_id,
            original_teacher_name=a.original_teacher.name,
            substitute_teacher_id=a.substitute_teacher_id,
            substitute_teacher_name=a.substitute_teacher.name,
            status=a.status
        )
        for a in created
    ]