from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import delete as sql_delete
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.weekly_requirement import (
    WeeklyRequirementCreate,
    WeeklyRequirementUpdate,
    WeeklyRequirementResponse
)
from app.models.weekly_requirement import WeeklyRequirement
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.services.timetable.period_schedule import PERIODS_PER_DAY
from app.core.exceptions import ResourceNotFoundException, ConflictException, ValidationException

router = APIRouter(
    prefix="/admin/weekly-requirements",
    tags=["Admin - Weekly Requirements"],
    dependencies=[Depends(require_admin)]
)

@router.post("/", response_model=WeeklyRequirementResponse, status_code=status.HTTP_201_CREATED)
def create_weekly_requirement(
    data: WeeklyRequirementCreate,
    db: Session = Depends(get_db)
):
    """
    Creates a new weekly requirement linking a class to a subject with a specified
    number of lectures per week (e.g. Class 8A needs Maths 6x/week).
    """
    # Verify that the class and subject exist
    school_class = db.get(SchoolClass, data.class_id)
    if not school_class:
        raise ResourceNotFoundException("Class", str(data.class_id))

    subject = db.get(Subject, data.subject_id)
    if not subject:
        raise ResourceNotFoundException("Subject", str(data.subject_id))

    # Check for duplicate (class_id, subject_id) combination
    stmt = select(WeeklyRequirement).where(
        WeeklyRequirement.class_id == data.class_id,
        WeeklyRequirement.subject_id == data.subject_id
    )
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        raise ConflictException(
            f"A weekly requirement for this class and subject already exists (ID: {existing.id}). "
            f"Use PUT to update it instead."
        )

    db_req = WeeklyRequirement(
        class_id=data.class_id,
        subject_id=data.subject_id,
        periods_per_week=data.periods_per_week
    )
    db.add(db_req)
    db.commit()

    # Reload with relationships for response
    stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).where(WeeklyRequirement.id == db_req.id)
    loaded = db.execute(stmt).scalar()

    return WeeklyRequirementResponse(
        id=loaded.id,
        class_id=loaded.class_id,
        class_name=loaded.school_class.class_name if loaded.school_class else None,
        division=loaded.school_class.division if loaded.school_class else None,
        subject_id=loaded.subject_id,
        subject_name=loaded.subject.subject_name if loaded.subject else None,
        periods_per_week=loaded.periods_per_week
    )

@router.get("/", response_model=List[WeeklyRequirementResponse])
def list_weekly_requirements(db: Session = Depends(get_db)):
    """
    Retrieves all weekly requirements with class and subject details.
    """
    stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).order_by(WeeklyRequirement.class_id, WeeklyRequirement.subject_id)
    result = db.execute(stmt)
    items = list(result.scalars().all())

    return [
        WeeklyRequirementResponse(
            id=r.id,
            class_id=r.class_id,
            class_name=r.school_class.class_name if r.school_class else None,
            division=r.school_class.division if r.school_class else None,
            subject_id=r.subject_id,
            subject_name=r.subject.subject_name if r.subject else None,
            periods_per_week=r.periods_per_week
        )
        for r in items
    ]

@router.put("/{id}", response_model=WeeklyRequirementResponse)
def update_weekly_requirement(
    id: int,
    data: WeeklyRequirementUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates the periods_per_week for an existing weekly requirement.
    """
    stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).where(WeeklyRequirement.id == id)
    req = db.execute(stmt).scalar_one_or_none()

    if not req:
        raise ResourceNotFoundException("WeeklyRequirement", str(id))

    req.periods_per_week = data.periods_per_week
    db.commit()
    db.refresh(req)

    return WeeklyRequirementResponse(
        id=req.id,
        class_id=req.class_id,
        class_name=req.school_class.class_name if req.school_class else None,
        division=req.school_class.division if req.school_class else None,
        subject_id=req.subject_id,
        subject_name=req.subject.subject_name if req.subject else None,
        periods_per_week=req.periods_per_week
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weekly_requirement(id: int, db: Session = Depends(get_db)):
    """
    Deletes a weekly requirement.
    """
    req = db.get(WeeklyRequirement, id)
    if not req:
        raise ResourceNotFoundException("WeeklyRequirement", str(id))

    db.delete(req)
    db.commit()
    return None


@router.post("/seed-defaults", response_model=List[WeeklyRequirementResponse], status_code=status.HTTP_201_CREATED)
def seed_default_requirements(
    periods_per_day: int = Query(default=PERIODS_PER_DAY, ge=1, description="Total teaching periods per day (fixed at 8)"),
    num_school_days: int = Query(default=6, ge=1, le=7, description="Number of school days per week"),
    db: Session = Depends(get_db),
):
    """
    Auto-generates sensible default weekly requirements for every (class, subject) combination.

    The algorithm distributes the total available periods per week across all subjects
    for each class, giving core subjects more weight than electives like PT, Art, or Music.

    Any existing weekly requirements are deleted first (full reset).
    """
    all_classes = list(db.execute(select(SchoolClass)).scalars().all())
    all_subjects = list(db.execute(select(Subject)).scalars().all())

    if not all_classes:
        raise ValidationException("No classes found in the database. Create classes first.")
    if not all_subjects:
        raise ValidationException("No subjects found in the database. Create subjects first.")

    total_periods_per_week = periods_per_day * num_school_days

    # Subject code patterns that get fewer periods (2/week)
    LIGHT_SUBJECT_CODES = {"pt", "art", "music", "drawing", "craft", "library", "yoga", "gk", "moral"}

    light_subjects = []
    core_subjects = []
    for s in all_subjects:
        code_lower = s.code.lower().strip()
        name_lower = s.subject_name.lower().strip()
        if code_lower in LIGHT_SUBJECT_CODES or name_lower in LIGHT_SUBJECT_CODES:
            light_subjects.append(s)
        else:
            core_subjects.append(s)

    # Calculate periods: light subjects get 2/week, rest distributed among core
    light_total = len(light_subjects) * 2
    remaining = total_periods_per_week - light_total

    if core_subjects:
        core_per_subject = max(remaining // len(core_subjects), 1)
    else:
        core_per_subject = 4

    # Delete all existing requirements (full reset)
    db.execute(sql_delete(WeeklyRequirement))
    db.flush()

    new_reqs = []
    for cls in all_classes:
        for subj in light_subjects:
            new_reqs.append(WeeklyRequirement(
                class_id=cls.id,
                subject_id=subj.id,
                periods_per_week=2
            ))
        for subj in core_subjects:
            new_reqs.append(WeeklyRequirement(
                class_id=cls.id,
                subject_id=subj.id,
                periods_per_week=core_per_subject
            ))

    db.add_all(new_reqs)
    db.commit()

    # Reload with relationships for response
    stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).order_by(WeeklyRequirement.class_id, WeeklyRequirement.subject_id)
    result = db.execute(stmt)
    items = list(result.scalars().all())

    return [
        WeeklyRequirementResponse(
            id=r.id,
            class_id=r.class_id,
            class_name=r.school_class.class_name if r.school_class else None,
            division=r.school_class.division if r.school_class else None,
            subject_id=r.subject_id,
            subject_name=r.subject.subject_name if r.subject else None,
            periods_per_week=r.periods_per_week
        )
        for r in items
    ]

