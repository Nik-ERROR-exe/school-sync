from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.database import get_db
from app.api.deps import require_admin
from app.models.subject_exam_component import SubjectExamComponent
from app.models.school_class import SchoolClass, class_subjects
from app.models.subject import Subject
from app.schemas.subject_exam_component import (
    SubjectExamComponentCreate,
    SubjectExamComponentUpdate,
    SubjectExamComponentResponse,
    SubjectExamComponentBatch,
)

router = APIRouter(
    prefix="/admin/subject-exam-components",
    tags=["Admin - Subject Exam Components"],
    dependencies=[Depends(require_admin)]
)


def _to_response(record: SubjectExamComponent) -> SubjectExamComponentResponse:
    return SubjectExamComponentResponse(
        id=record.id,
        class_name=record.class_name,
        subject_id=record.subject_id,
        subject_name=record.subject.subject_name if record.subject else None,
        subject_code=record.subject.code if record.subject else None,
        exam_type_id=record.exam_type_id,
        exam_type_name=record.exam_type.name if record.exam_type else None,
        component_code=record.component_code,
        display_label=record.display_label,
        max_marks=record.max_marks,
        display_order=record.display_order,
    )


async def _reload(db: AsyncSession, component_id: int) -> SubjectExamComponent:
    stmt = (
        select(SubjectExamComponent)
        .options(
            joinedload(SubjectExamComponent.subject),
            joinedload(SubjectExamComponent.exam_type),
        )
        .where(SubjectExamComponent.id == component_id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.get("/by-class/{class_name}/exam/{exam_type_id}")
async def get_components_by_class(
    class_name: str,
    exam_type_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Return every subject of a class grouped with its configured components."""
    class_ids = (await db.execute(
        select(SchoolClass.id).where(SchoolClass.class_name == class_name)
    )).scalars().all()

    if not class_ids:
        return []

    subjects_stmt = (
        select(Subject)
        .join(class_subjects, Subject.id == class_subjects.c.subject_id)
        .where(class_subjects.c.class_id.in_(class_ids))
        .distinct()
        .order_by(Subject.subject_name)
    )
    subjects = list((await db.execute(subjects_stmt)).scalars().all())

    comp_stmt = (
        select(SubjectExamComponent)
        .options(
            joinedload(SubjectExamComponent.subject),
            joinedload(SubjectExamComponent.exam_type),
        )
        .where(
            SubjectExamComponent.class_name == class_name,
            SubjectExamComponent.exam_type_id == exam_type_id,
        )
        .order_by(SubjectExamComponent.display_order, SubjectExamComponent.id)
    )
    comps = (await db.execute(comp_stmt)).scalars().unique().all()

    by_subject = {}
    for c in comps:
        by_subject.setdefault(c.subject_id, []).append({
            "id": c.id,
            "component_code": c.component_code,
            "display_label": c.display_label,
            "max_marks": float(c.max_marks),
            "display_order": c.display_order,
        })

    return [
        {
            "subject_id": s.id,
            "subject_name": s.subject_name,
            "subject_code": s.code,
            "components": by_subject.get(s.id, []),
        }
        for s in subjects
    ]


@router.post("/", response_model=SubjectExamComponentResponse, status_code=status.HTTP_201_CREATED)
async def create_component(
    data: SubjectExamComponentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a component definition for a subject/exam pair."""
    chk = select(SubjectExamComponent).where(
        SubjectExamComponent.class_name == data.class_name,
        SubjectExamComponent.subject_id == data.subject_id,
        SubjectExamComponent.exam_type_id == data.exam_type_id,
        SubjectExamComponent.component_code == data.component_code,
    )
    existing = (await db.execute(chk)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Component already configured for this class, subject, exam type and code",
        )

    record = SubjectExamComponent(
        class_name=data.class_name,
        subject_id=data.subject_id,
        exam_type_id=data.exam_type_id,
        component_code=data.component_code,
        display_label=data.display_label,
        max_marks=data.max_marks,
        display_order=data.display_order,
    )
    db.add(record)
    await db.commit()
    reloaded = await _reload(db, record.id)
    return _to_response(reloaded)


@router.post("/batch", response_model=List[SubjectExamComponentResponse])
async def batch_upsert_components(
    data: SubjectExamComponentBatch,
    db: AsyncSession = Depends(get_db)
):
    """Upsert component definitions in one shot."""
    if not data.items:
        return []

    touched_ids = []
    for item in data.items:
        chk = select(SubjectExamComponent).where(
            SubjectExamComponent.class_name == item.class_name,
            SubjectExamComponent.subject_id == item.subject_id,
            SubjectExamComponent.exam_type_id == item.exam_type_id,
            SubjectExamComponent.component_code == item.component_code,
        )
        existing = (await db.execute(chk)).scalars().first()
        if existing:
            existing.display_label = item.display_label
            existing.max_marks = item.max_marks
            existing.display_order = item.display_order
            touched_ids.append(existing.id)
        else:
            record = SubjectExamComponent(
                class_name=item.class_name,
                subject_id=item.subject_id,
                exam_type_id=item.exam_type_id,
                component_code=item.component_code,
                display_label=item.display_label,
                max_marks=item.max_marks,
                display_order=item.display_order,
            )
            db.add(record)
            await db.flush()
            touched_ids.append(record.id)

    await db.commit()

    reload_stmt = (
        select(SubjectExamComponent)
        .options(
            joinedload(SubjectExamComponent.subject),
            joinedload(SubjectExamComponent.exam_type),
        )
        .where(SubjectExamComponent.id.in_(touched_ids))
    )
    records = (await db.execute(reload_stmt)).scalars().unique().all()
    return [_to_response(r) for r in records]


@router.get("/", response_model=List[SubjectExamComponentResponse])
async def list_components(
    class_name: Optional[str] = Query(None),
    exam_type_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Flat, filterable list of component definitions."""
    stmt = (
        select(SubjectExamComponent)
        .options(
            joinedload(SubjectExamComponent.subject),
            joinedload(SubjectExamComponent.exam_type),
        )
    )
    if class_name:
        stmt = stmt.where(SubjectExamComponent.class_name == class_name)
    if exam_type_id is not None:
        stmt = stmt.where(SubjectExamComponent.exam_type_id == exam_type_id)
    if subject_id is not None:
        stmt = stmt.where(SubjectExamComponent.subject_id == subject_id)
    stmt = stmt.order_by(SubjectExamComponent.id)
    records = (await db.execute(stmt)).scalars().unique().all()
    return [_to_response(r) for r in records]


@router.get("/distinct-codes")
async def list_distinct_component_codes(
    db: AsyncSession = Depends(get_db)
):
    """
    Return every distinct component_code that has ever been configured,
    with the most common display_label for it and the number of
    subject/exam configurations using it. Used by the admin
    configuration UI to offer a dropdown of existing codes so codes
    stay consistent across classes.
    """
    stmt = (
        select(
            SubjectExamComponent.component_code,
            SubjectExamComponent.display_label,
        )
    )
    rows = (await db.execute(stmt)).all()

    by_code: dict[str, dict[str, int]] = {}
    for code, label in rows:
        by_code.setdefault(code, {})
        by_code[code][label] = by_code[code].get(label, 0) + 1

    result = []
    for code, label_counts in by_code.items():
        top_label = max(label_counts.items(), key=lambda kv: kv[1])[0]
        total = sum(label_counts.values())
        result.append({
            "component_code": code,
            "common_label": top_label,
            "usages": total,
        })
    result.sort(key=lambda r: (-r["usages"], r["component_code"]))
    return result


@router.put("/{component_id}", response_model=SubjectExamComponentResponse)
async def update_component(
    component_id: int,
    data: SubjectExamComponentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update label / max marks / display order of a component definition."""
    stmt = select(SubjectExamComponent).where(SubjectExamComponent.id == component_id)
    record = (await db.execute(stmt)).scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Component not found")

    if data.display_label is not None:
        record.display_label = data.display_label
    if data.max_marks is not None:
        record.max_marks = data.max_marks
    if data.display_order is not None:
        record.display_order = data.display_order

    await db.commit()
    reloaded = await _reload(db, record.id)
    return _to_response(reloaded)


@router.delete("/{component_id}")
async def delete_component(
    component_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a component definition.

    Historical result_components rows keyed by the same component_code are
    intentionally left intact so historical marks remain readable.
    """
    stmt = select(SubjectExamComponent).where(SubjectExamComponent.id == component_id)
    record = (await db.execute(stmt)).scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Component not found")

    await db.delete(record)
    await db.commit()
    return {"message": "Deleted"}
