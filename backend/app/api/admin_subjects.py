from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.subject import SubjectResponse, SubjectCreate
from app.models.subject import Subject
from app.models.school_class import class_subjects
from app.models.weekly_requirement import WeeklyRequirement
from app.core.exceptions import ResourceNotFoundException, ConflictException, ValidationException

router = APIRouter(
    prefix="/admin/subjects",
    tags=["Admin - Subject Management"],
    dependencies=[Depends(require_admin)]
)

@router.get("/", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    """
    Returns all subjects from the database.
    Used by the timetable wizard to select the PT subject.
    """
    stmt = select(Subject).order_by(Subject.id)
    result = db.execute(stmt)
    return list(result.scalars().all())

@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    """
    Creates a new subject. Check for duplicate code (409 if exists).
    """
    existing = db.execute(
        select(Subject).where(Subject.code == data.code)
    ).scalar_one_or_none()
    if existing:
        raise ConflictException(f"Subject with code '{data.code}' already exists.")
        
    db_subj = Subject(
        subject_name=data.subject_name,
        code=data.code
    )
    db.add(db_subj)
    db.commit()
    db.refresh(db_subj)
    return db_subj

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    """
    Deletes a subject.
    Check: if any class_subjects or weekly_requirements reference this subject,
    return 400 "Cannot delete subject assigned to classes or weekly requirements."
    """
    db_subj = db.get(Subject, subject_id)
    if not db_subj:
        raise ResourceNotFoundException("Subject", str(subject_id))
        
    # Check if assigned to any class in class_subjects
    has_class_subject = db.execute(
        select(class_subjects.c.subject_id).where(class_subjects.c.subject_id == subject_id).limit(1)
    ).scalar_one_or_none()
    if has_class_subject:
        raise ValidationException("Cannot delete subject assigned to classes or weekly requirements.")
        
    # Check if referenced in weekly_requirements
    has_weekly_req = db.execute(
        select(WeeklyRequirement.id).where(WeeklyRequirement.subject_id == subject_id).limit(1)
    ).scalar_one_or_none()
    if has_weekly_req:
        raise ValidationException("Cannot delete subject assigned to classes or weekly requirements.")
        
    db.delete(db_subj)
    db.commit()
    return None
