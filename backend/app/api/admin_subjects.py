from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.school_class import class_subjects
from app.models.weekly_requirement import WeeklyRequirement
from app.schemas.subject import SubjectResponse, SubjectCreate
from app.core.exceptions import ResourceNotFoundException, ConflictException, ValidationException

router = APIRouter(
    prefix="/admin/subjects",
    tags=["Admin - Subject Management"],
    dependencies=[Depends(require_admin)]
)


@router.get("/", response_model=List[SubjectResponse])
async def list_subjects(db: AsyncSession = Depends(get_db)):
    """Returns all subjects from the database asynchronously."""
    stmt = select(Subject).order_by(Subject.id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    data: SubjectCreate,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new subject asynchronously. Checks for duplicate code."""
    res = await db.execute(select(Subject).where(Subject.code == data.code))
    existing = res.scalar_one_or_none()
    if existing:
        raise ConflictException(f"Subject with code '{data.code}' already exists.")
        
    db_subj = Subject(
        subject_name=data.subject_name,
        code=data.code
    )
    db.add(db_subj)
    await db.commit()
    await db.refresh(db_subj)
    return db_subj


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(subject_id: int, db: AsyncSession = Depends(get_db)):
    """Deletes a subject asynchronously. Verifies no dependencies in class_subjects or weekly_requirements."""
    db_subj = await db.get(Subject, subject_id)
    if not db_subj:
        raise ResourceNotFoundException("Subject", str(subject_id))
        
    # Check if assigned to any class in class_subjects
    res_cs = await db.execute(
        select(class_subjects.c.subject_id).where(class_subjects.c.subject_id == subject_id).limit(1)
    )
    if res_cs.scalar_one_or_none():
        raise ValidationException("Cannot delete subject assigned to classes or weekly requirements.")
        
    # Check if referenced in weekly_requirements
    res_wr = await db.execute(
        select(WeeklyRequirement.id).where(WeeklyRequirement.subject_id == subject_id).limit(1)
    )
    if res_wr.scalar_one_or_none():
        raise ValidationException("Cannot delete subject assigned to classes or weekly requirements.")
        
    await db.delete(db_subj)
    await db.commit()
    return None
