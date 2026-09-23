from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
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
        akarikh_max=float(record.akarikh_max),
        oral_max=float(record.oral_max),
        written_max=float(record.written_max),
        max_marks=float(record.akarikh_max) + float(record.oral_max) + float(record.written_max),
    )


@router.get("/", response_model=List[SubjectMaxMarksResponse])
async def list_subject_max_marks(
    class_name: Optional[str] = Query(None),
    exam_type_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List subject max marks configurations asynchronously."""
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
    results = (await db.execute(stmt)).scalars().all()
    return [_to_response(r) for r in results]


@router.get("/missing", response_model=List[SubjectResponse])
async def get_missing_subject_max_marks(
    class_name: str = Query(...),
    exam_type_id: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Find subjects in a class that lack max marks configuration for an exam type."""
    stmt_class = (
        select(SchoolClass)
        .options(joinedload(SchoolClass.subjects))
        .where(SchoolClass.class_name == class_name)
    )
    school_class = (await db.execute(stmt_class)).scalars().first()
    if not school_class:
        return []

    stmt_max = select(SubjectMaxMarks.subject_id).where(
        SubjectMaxMarks.class_name == class_name,
        SubjectMaxMarks.exam_type_id == exam_type_id,
    )
    configured_subj_ids = set((await db.execute(stmt_max)).scalars().all())

    all_subjects = school_class.subjects
    return [s for s in all_subjects if s.id not in configured_subj_ids]


@router.post("/", response_model=SubjectMaxMarksResponse, status_code=status.HTTP_201_CREATED)
async def create_subject_max_marks(
    data: SubjectMaxMarksCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new subject max marks configuration asynchronously."""
    chk_stmt = select(SubjectMaxMarks).where(
        SubjectMaxMarks.class_name == data.class_name,
        SubjectMaxMarks.subject_id == data.subject_id,
        SubjectMaxMarks.exam_type_id == data.exam_type_id,
    )
    existing = (await db.execute(chk_stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Max marks configuration already exists for this class, subject, and exam type"
        )

    record = SubjectMaxMarks(
        class_name=data.class_name,
        subject_id=data.subject_id,
        exam_type_id=data.exam_type_id,
        akarikh_max=data.akarikh_max,
        oral_max=data.oral_max,
        written_max=data.written_max,
        max_marks=data.akarikh_max + data.oral_max + data.written_max,
    )
    db.add(record)
    await db.commit()

    # Reload with joined relationships
    reload_stmt = (
        select(SubjectMaxMarks)
        .options(
            joinedload(SubjectMaxMarks.subject),
            joinedload(SubjectMaxMarks.exam_type)
        )
        .where(SubjectMaxMarks.id == record.id)
    )
    record = (await db.execute(reload_stmt)).scalar_one()
    return _to_response(record)


@router.put("/{record_id}", response_model=SubjectMaxMarksResponse)
async def update_subject_max_marks(
    record_id: int,
    data: SubjectMaxMarksUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a subject max marks configuration asynchronously."""
    stmt = (
        select(SubjectMaxMarks)
        .options(
            joinedload(SubjectMaxMarks.subject),
            joinedload(SubjectMaxMarks.exam_type)
        )
        .where(SubjectMaxMarks.id == record_id)
    )
    record = (await db.execute(stmt)).scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Subject max marks configuration not found")

    record.akarikh_max = data.akarikh_max
    record.oral_max = data.oral_max
    record.written_max = data.written_max
    record.max_marks = data.akarikh_max + data.oral_max + data.written_max
    await db.commit()

    reload_stmt = (
        select(SubjectMaxMarks)
        .options(
            joinedload(SubjectMaxMarks.subject),
            joinedload(SubjectMaxMarks.exam_type)
        )
        .where(SubjectMaxMarks.id == record.id)
    )
    record = (await db.execute(reload_stmt)).scalar_one()
    return _to_response(record)


@router.delete("/{record_id}")
async def delete_subject_max_marks(
    record_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a subject max marks configuration asynchronously."""
    res = await db.execute(select(SubjectMaxMarks).where(SubjectMaxMarks.id == record_id))
    record = res.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Subject max marks configuration not found")

    await db.delete(record)
    await db.commit()
    return {"message": "Deleted successfully"}


@router.put("/batch", response_model=List[SubjectMaxMarksResponse])
async def batch_update_subject_max_marks(
    updates: SubjectMaxMarksBatchUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Batch update max_marks for multiple subject max marks records asynchronously."""
    if not updates.updates:
        return []

    updated_ids = []
    for update in updates.updates:
        stmt = (
            select(SubjectMaxMarks)
            .options(
                joinedload(SubjectMaxMarks.subject),
                joinedload(SubjectMaxMarks.exam_type)
            )
            .where(SubjectMaxMarks.id == update.id)
        )
        record = (await db.execute(stmt)).scalar_one_or_none()
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Subject max marks configuration with id {update.id} not found"
            )
        record.akarikh_max = update.akarikh_max
        record.oral_max = update.oral_max
        record.written_max = update.written_max
        record.max_marks = update.akarikh_max + update.oral_max + update.written_max
        updated_ids.append(record.id)

    await db.commit()

    reload_stmt = (
        select(SubjectMaxMarks)
        .options(
            joinedload(SubjectMaxMarks.subject),
            joinedload(SubjectMaxMarks.exam_type)
        )
        .where(SubjectMaxMarks.id.in_(updated_ids))
    )
    records = (await db.execute(reload_stmt)).scalars().all()
    return [_to_response(r) for r in records]


@router.post("/copy", response_model=List[SubjectMaxMarksResponse])
async def copy_subject_max_marks(
    data: SubjectMaxMarksCopy,
    db: AsyncSession = Depends(get_db)
):
    """Copy max marks configurations from one exam type to another asynchronously."""
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

    source_records = (await db.execute(stmt)).scalars().all()

    if not source_records:
        return []

    class_names = [r.class_name for r in source_records]
    existing_stmt = select(SubjectMaxMarks.class_name, SubjectMaxMarks.subject_id).where(
        SubjectMaxMarks.exam_type_id == data.target_exam_type_id,
        SubjectMaxMarks.class_name.in_(class_names),
    )
    existing_target = (await db.execute(existing_stmt)).all()
    existing_target_set = {(r[0], r[1]) for r in existing_target}

    new_records = []
    for record in source_records:
        key = (record.class_name, record.subject_id)
        if key in existing_target_set:
            continue
        new_record = SubjectMaxMarks(
            class_name=record.class_name,
            subject_id=record.subject_id,
            exam_type_id=data.target_exam_type_id,
            akarikh_max=record.akarikh_max,
            oral_max=record.oral_max,
            written_max=record.written_max,
            max_marks=record.akarikh_max + record.oral_max + record.written_max,
        )
        db.add(new_record)
        new_records.append(new_record)

    await db.commit()

    if not new_records:
        return []

    new_ids = [r.id for r in new_records]
    reload_stmt = (
        select(SubjectMaxMarks)
        .options(
            joinedload(SubjectMaxMarks.subject),
            joinedload(SubjectMaxMarks.exam_type)
        )
        .where(SubjectMaxMarks.id.in_(new_ids))
    )
    reloaded = (await db.execute(reload_stmt)).scalars().all()
    return [_to_response(r) for r in reloaded]