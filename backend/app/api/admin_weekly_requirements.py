from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
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
from app.core.exceptions import ResourceNotFoundException, ConflictException

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
    """
    Creates a new weekly requirement linking a class to a subject with a specified
    number of lectures per week (e.g. Class 8A needs Maths 6x/week).
    """
    # Verify that the class and subject exist
    school_class = await db.get(SchoolClass, data.class_id)
    if not school_class:
        raise ResourceNotFoundException("Class", str(data.class_id))

    subject = await db.get(Subject, data.subject_id)
    if not subject:
        raise ResourceNotFoundException("Subject", str(data.subject_id))

    # Check for duplicate (class_id, subject_id) combination
    stmt = select(WeeklyRequirement).where(
        WeeklyRequirement.class_id == data.class_id,
        WeeklyRequirement.subject_id == data.subject_id
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
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
    stmt = select(WeeklyRequirement).options(
        joinedload(WeeklyRequirement.school_class),
        joinedload(WeeklyRequirement.subject)
    ).where(WeeklyRequirement.id == db_req.id)
    loaded = (await db.execute(stmt)).scalar()

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
    """
    Retrieves all weekly requirements with class and subject details.
    """
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
    """
    Updates the periods_per_week for an existing weekly requirement.
    """
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
    """
    Deletes a weekly requirement.
    """
    req = await db.get(WeeklyRequirement, id)
    if not req:
        raise ResourceNotFoundException("WeeklyRequirement", str(id))

    await db.delete(req)
    await db.commit()
    return None
