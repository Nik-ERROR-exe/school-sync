from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.future import select
from typing import List, Optional

from app.database import get_db
from app.api.deps import require_admin
from app.models.subject_max_marks import SubjectMaxMarks
from app.models.school_class import SchoolClass
from app.schemas.subject_max_marks import (
    SubjectMaxMarksCreate,
    SubjectMaxMarksUpdate,
    SubjectMaxMarksResponse,
    SubjectMaxMarksBatchUpdate,
    SubjectMaxMarksCopy,
)
from app.schemas.subject import SubjectResponse

router = APIRouter(
    prefix="/admin/subject-max-marks",
    tags=["Admin - Subject Max Marks"],
    dependencies=[Depends(require_admin)]
)


def _to_response(record: SubjectMaxMarks) -> SubjectMaxMarksResponse:
    return SubjectMaxMarksResponse(
        id=record.id,
        class_name=record.class_name,
        subject_id=record.subject_id,
        subject_name=record.subject.subject_name if record.subject else None,
        subject_code=record.subject.code if record.subject else None,
        exam_type_id=record.exam_type_id,
        exam_type_name=record.exam_type.name if record.exam_type else None,
        max_marks=float(record.max_marks)
    )


@router.get("/", response_model=List[SubjectMaxMarksResponse])
def list_subject_max_marks(
    class_name: Optional[str] = Query(None),
    exam_type_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    stmt = (
        select(SubjectMaxMarks)
        .options(
            joinedload(SubjectMaxMarks.subject),
            joinedload(SubjectMaxMarks.exam_type)
        )
    )
    if class_name:
        stmt = stmt.where(SubjectMaxMarks.class_name == class_name)
    if exam_type_id is not None:
        stmt = stmt.where(SubjectMaxMarks.exam_type_id == exam_type_id)
    stmt = stmt.order_by(SubjectMaxMarks.id)
    results = db.execute(stmt).scalars().all()
    return [_to_response(r) for r in results]


@router.get("/missing", response_model=List[SubjectResponse])
def get_missing_subject_max_marks(
    class_name: str = Query(...),
    exam_type_id: int = Query(...),
    db: Session = Depends(get_db)
):
    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.class_name == class_name)
        .first()
    )
    if not school_class:
        return []

    configured_subj_ids = {
        r[0]
        for r in db.query(SubjectMaxMarks.subject_id)
        .filter(
            SubjectMaxMarks.class_name == class_name,
            SubjectMaxMarks.exam_type_id == exam_type_id,
        )
        .all()
    }

    all_subjects = school_class.subjects
    return [s for s in all_subjects if s.id not in configured_subj_ids]


@router.post("/", response_model=SubjectMaxMarksResponse, status_code=status.HTTP_201_CREATED)
def create_subject_max_marks(
    data: SubjectMaxMarksCreate,
    db: Session = Depends(get_db)
):
    existing = (
        db.query(SubjectMaxMarks)
        .filter(
            SubjectMaxMarks.class_name == data.class_name,
            SubjectMaxMarks.subject_id == data.subject_id,
            SubjectMaxMarks.exam_type_id == data.exam_type_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Max marks configuration already exists for this class, subject, and exam type"
        )

    record = SubjectMaxMarks(
        class_name=data.class_name,
        subject_id=data.subject_id,
        exam_type_id=data.exam_type_id,
        max_marks=data.max_marks,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.put("/{record_id}", response_model=SubjectMaxMarksResponse)
def update_subject_max_marks(
    record_id: int,
    data: SubjectMaxMarksUpdate,
    db: Session = Depends(get_db)
):
    record = (
        db.query(SubjectMaxMarks)
        .options(
            joinedload(SubjectMaxMarks.subject),
            joinedload(SubjectMaxMarks.exam_type)
        )
        .filter(SubjectMaxMarks.id == record_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Subject max marks configuration not found")

    record.max_marks = data.max_marks
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.delete("/{record_id}")
def delete_subject_max_marks(
    record_id: int,
    db: Session = Depends(get_db)
):
    record = db.query(SubjectMaxMarks).filter(SubjectMaxMarks.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Subject max marks configuration not found")

    db.delete(record)
    db.commit()
    return {"message": "Deleted successfully"}


@router.put("/batch", response_model=List[SubjectMaxMarksResponse])
def batch_update_subject_max_marks(
    updates: SubjectMaxMarksBatchUpdate,
    db: Session = Depends(get_db)
):
    """
    Batch update max_marks for multiple subject max marks records.
    Accepts a list of {id, max_marks} and updates all in one transaction.
    """
    if not updates.updates:
        return []

    updated_records = []
    for update in updates.updates:
        stmt = (
            select(SubjectMaxMarks)
            .options(
                joinedload(SubjectMaxMarks.subject),
                joinedload(SubjectMaxMarks.exam_type)
            )
            .where(SubjectMaxMarks.id == update.id)
        )
        record = db.execute(stmt).scalar_one_or_none()
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Subject max marks configuration with id {update.id} not found"
            )
        record.max_marks = update.max_marks
        updated_records.append(record)

    db.commit()

    # Refresh all records to get updated relationships
    for record in updated_records:
        db.refresh(record)

    return [_to_response(r) for r in updated_records]


@router.post("/copy", response_model=List[SubjectMaxMarksResponse])
def copy_subject_max_marks(
    data: SubjectMaxMarksCopy,
    db: Session = Depends(get_db)
):
    """
    Copy max marks configurations from one exam type to another.
    Optionally filter by class_name. Skips duplicates.
    """
    if data.source_exam_type_id == data.target_exam_type_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and target exam types must be different"
        )

    stmt = select(SubjectMaxMarks).where(
        SubjectMaxMarks.exam_type_id == data.source_exam_type_id
    )
    if data.class_name:
        stmt = stmt.where(SubjectMaxMarks.class_name == data.class_name)

    source_records = db.execute(stmt).scalars().all()

    if not source_records:
        return []

    # Find existing target configs to skip duplicates
    existing_target = db.query(SubjectMaxMarks.subject_id).filter(
        SubjectMaxMarks.exam_type_id == data.target_exam_type_id,
        SubjectMaxMarks.class_name.in_([r.class_name for r in source_records]),
    ).all()
    existing_target_set = {(r.class_name, r[0]) for r in existing_target}

    new_records = []
    for record in source_records:
        key = (record.class_name, record.subject_id)
        if key in existing_target_set:
            continue
        new_record = SubjectMaxMarks(
            class_name=record.class_name,
            subject_id=record.subject_id,
            exam_type_id=data.target_exam_type_id,
            max_marks=record.max_marks,
        )
        db.add(new_record)
        new_records.append(new_record)

    db.commit()
    for record in new_records:
        db.refresh(record)

    return [_to_response(r) for r in new_records]