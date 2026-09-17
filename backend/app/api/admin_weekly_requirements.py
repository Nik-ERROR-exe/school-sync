from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import delete as sql_delete
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
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
async def create_weekly_requirement(
    data: WeeklyRequirementCreate,
    db: AsyncSession = Depends(get_db)
):
    """Creates a new weekly requirement linking a class to a subject with a specified
    number of lectures per week asynchronously.
    """
    school_class = await db.get(SchoolClass, data.class_id)
    if not school_class:
        raise ResourceNotFoundException("Class", str(data.class_id))

    subject = await db.get(Subject, data.subject_id)
    if not subject:
        raise ResourceNotFoundException("Subject", str(data.subject_id))

    stmt = select(WeeklyRequirement).where(
        WeeklyRequirement.class_id == data.class_id,
        WeeklyRequirement.subject_id == data.subject_id
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
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
    await db.commit()

    # Reload with relationships for response
    reload_stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).where(WeeklyRequirement.id == db_req.id)
    loaded = (await db.execute(reload_stmt)).scalar()

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
async def list_weekly_requirements(db: AsyncSession = Depends(get_db)):
    """Retrieves all weekly requirements with class and subject details asynchronously."""
    stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).order_by(WeeklyRequirement.class_id, WeeklyRequirement.subject_id)
    result = await db.execute(stmt)
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
async def update_weekly_requirement(
    id: int,
    data: WeeklyRequirementUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Updates the periods_per_week for an existing weekly requirement asynchronously."""
    stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).where(WeeklyRequirement.id == id)
    req = (await db.execute(stmt)).scalar_one_or_none()

    if not req:
        raise ResourceNotFoundException("WeeklyRequirement", str(id))

    req.periods_per_week = data.periods_per_week
    await db.commit()
    await db.refresh(req)

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
async def delete_weekly_requirement(id: int, db: AsyncSession = Depends(get_db)):
    """Deletes a weekly requirement asynchronously."""
    req = await db.get(WeeklyRequirement, id)
    if not req:
        raise ResourceNotFoundException("WeeklyRequirement", str(id))

    await db.delete(req)
    await db.commit()
    return None


@router.post("/seed-defaults", response_model=List[WeeklyRequirementResponse], status_code=status.HTTP_201_CREATED)
async def seed_default_requirements(
    periods_per_day: int = Query(default=PERIODS_PER_DAY, ge=1, description="Total teaching periods per day (fixed at 8)"),
    num_school_days: int = Query(default=6, ge=1, le=7, description="Number of school days per week"),
    db: AsyncSession = Depends(get_db),
):
    """Auto-generates sensible default weekly requirements for every (class, subject) combination asynchronously."""
    classes_res = await db.execute(select(SchoolClass))
    all_classes = list(classes_res.scalars().all())

    subjects_res = await db.execute(select(Subject))
    all_subjects = list(subjects_res.scalars().all())

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
    await db.execute(sql_delete(WeeklyRequirement))

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
    await db.commit()

    # Reload with relationships for response
    stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).order_by(WeeklyRequirement.class_id, WeeklyRequirement.subject_id)
    result = await db.execute(stmt)
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
