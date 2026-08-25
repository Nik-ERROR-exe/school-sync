from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.school_class import SchoolClassResponse, SchoolClassCreate, ClassSubjectsUpdate
from app.schemas.subject import SubjectResponse
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.timetable import TimetableSlot
from app.models.weekly_requirement import WeeklyRequirement
from app.models.student import Student
from app.models.result import Result
from app.core.exceptions import ResourceNotFoundException, ConflictException, ValidationException

router = APIRouter(
    prefix="/admin/classes",
    tags=["Admin - School Class Management"],
    dependencies=[Depends(require_admin)]
)

@router.get("/", response_model=List[SchoolClassResponse])
def list_classes(db: Session = Depends(get_db)):
    """
    Returns all classes with their assigned subjects (eager-loaded).
    """
    stmt = (
        select(SchoolClass)
        .options(joinedload(SchoolClass.subjects))
        .order_by(SchoolClass.class_name, SchoolClass.division)
    )
    result = db.execute(stmt)
    return list(result.scalars().unique().all())
@router.post("/", response_model=SchoolClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(data: SchoolClassCreate, db: Session = Depends(get_db)):
    """
    Create a new class. Check for duplicate (class_name, division).
    """
    existing = db.execute(
        select(SchoolClass).where(
            SchoolClass.class_name == data.class_name,
            SchoolClass.division == data.division
        )
    ).scalar_one_or_none()
    if existing:
        raise ConflictException(
            f"Class '{data.class_name}' Division '{data.division}' already exists."
        )

    new_class = SchoolClass(
        class_name=data.class_name,
        division=data.division
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

@router.get("/{class_id}/subjects", response_model=List[SubjectResponse])
def get_class_subjects(class_id: int, db: Session = Depends(get_db)):
    """
    Get all subjects assigned to a specific class.
    """
    school_class = db.get(SchoolClass, class_id)
    if not school_class:
        raise ResourceNotFoundException("Class", str(class_id))
    return school_class.subjects

@router.put("/{class_id}/subjects", response_model=SchoolClassResponse)
def update_class_subjects(
    class_id: int,
    data: ClassSubjectsUpdate,
    db: Session = Depends(get_db)
):
    """
    Replace the entire subject list for a class.
    Verifies all subject_ids exist, then replaces the assignment.
    """
    # 1. Verify class exists
    stmt = (
        select(SchoolClass)
        .options(joinedload(SchoolClass.subjects))
        .where(SchoolClass.id == class_id)
    )
    school_class = db.execute(stmt).scalars().unique().one_or_none()
    if not school_class:
        raise ResourceNotFoundException("Class", str(class_id))

    # 2. Verify all subject_ids exist
    if data.subject_ids:
        subjects_stmt = select(Subject).where(Subject.id.in_(data.subject_ids))
        found_subjects = list(db.execute(subjects_stmt).scalars().all())
        if len(found_subjects) != len(data.subject_ids):
            found_ids = {s.id for s in found_subjects}
            missing = [sid for sid in data.subject_ids if sid not in found_ids]
            raise ValidationException(f"Subject IDs not found: {missing}")
        school_class.subjects = found_subjects
    else:
        school_class.subjects = []

    # 3. Commit and return
    db.commit()
    db.refresh(school_class)
    return school_class
@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(class_id: int, db: Session = Depends(get_db)):
    """
    Delete a class. Refuses if timetable slots or results reference it.
    """
    school_class = db.get(SchoolClass, class_id)
    if not school_class:
        raise ResourceNotFoundException("Class", str(class_id))

    # Check for timetable slots referencing this class
    has_timetable = db.execute(
        select(TimetableSlot.id).where(TimetableSlot.class_id == class_id).limit(1)
    ).scalar_one_or_none()
    if has_timetable:
        raise ValidationException(
            "Cannot delete class with existing timetable or results."
        )

    # Check for results referencing this class (via student)
    has_results = db.execute(
        select(Result.id)
        .join(Student, Result.student_id == Student.id)
        .where(Student.class_id == class_id)
        .limit(1)
    ).scalar_one_or_none()
    if has_results:
        raise ValidationException(
            "Cannot delete class with existing timetable or results."
        )

    db.delete(school_class)
    db.commit()
    return None
