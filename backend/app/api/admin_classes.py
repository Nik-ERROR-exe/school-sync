from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.school_class import (
    SchoolClassResponse,
    SchoolClassCreate,
    ClassSubjectsUpdate,
    ClassTeacherAssignmentRequest,
    ClassTeacherAssignmentResponse,
    ClearedClassInfo,
)
from app.schemas.subject import SubjectResponse
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.timetable import TimetableSlot
from app.models.weekly_requirement import WeeklyRequirement
from app.models.student import Student
from app.models.result import Result
from app.core.exceptions import ResourceNotFoundException, ConflictException, ValidationException
from app.core.class_sorter import sort_classes_natural

router = APIRouter(
    prefix="/admin/classes",
    tags=["Admin - School Class Management"],
    dependencies=[Depends(require_admin)]
)


@router.get("/", response_model=List[SchoolClassResponse])
async def list_classes(db: AsyncSession = Depends(get_db)):
    """Returns all classes with their assigned subjects (eager-loaded)."""
    stmt = (
        select(SchoolClass)
        .options(joinedload(SchoolClass.subjects))
    )
    result = await db.execute(stmt)
    classes = list(result.scalars().unique().all())
    return sort_classes_natural(classes)


@router.post("/", response_model=SchoolClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(data: SchoolClassCreate, db: AsyncSession = Depends(get_db)):
    """Create a new class. Check for duplicate (class_name, division)."""
    res = await db.execute(
        select(SchoolClass).where(
            SchoolClass.class_name == data.class_name,
            SchoolClass.division == data.division
        )
    )
    existing = res.scalar_one_or_none()
    if existing:
        raise ConflictException(
            f"Class '{data.class_name}' Division '{data.division}' already exists."
        )

    new_class = SchoolClass(
        class_name=data.class_name,
        division=data.division
    )
    db.add(new_class)
    await db.commit()
    await db.refresh(new_class)
    return new_class


@router.get("/{class_id}/subjects", response_model=List[SubjectResponse])
async def get_class_subjects(class_id: int, db: AsyncSession = Depends(get_db)):
    """Get all subjects assigned to a specific class."""
    stmt = select(SchoolClass).options(joinedload(SchoolClass.subjects)).where(SchoolClass.id == class_id)
    school_class = (await db.execute(stmt)).scalars().unique().one_or_none()
    if not school_class:
        raise ResourceNotFoundException("Class", str(class_id))
    return school_class.subjects


@router.put("/{class_id}/subjects", response_model=SchoolClassResponse)
async def update_class_subjects(
    class_id: int,
    data: ClassSubjectsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Replace the entire subject list for a class.
    Verifies all subject_ids exist, then replaces the assignment.
    """
    # 1. Verify class exists
    stmt = (
        select(SchoolClass)
        .options(joinedload(SchoolClass.subjects))
        .where(SchoolClass.id == class_id)
    )
    school_class = (await db.execute(stmt)).scalars().unique().one_or_none()
    if not school_class:
        raise ResourceNotFoundException("Class", str(class_id))

    # 2. Verify all subject_ids exist
    if data.subject_ids:
        subjects_stmt = select(Subject).where(Subject.id.in_(data.subject_ids))
        res = await db.execute(subjects_stmt)
        found_subjects = list(res.scalars().all())
        if len(found_subjects) != len(data.subject_ids):
            found_ids = {s.id for s in found_subjects}
            missing = [sid for sid in data.subject_ids if sid not in found_ids]
            raise ValidationException(f"Subject IDs not found: {missing}")
        school_class.subjects = found_subjects
    else:
        school_class.subjects = []

    # 3. Commit and return
    await db.commit()
    await db.refresh(school_class)
    return school_class


@router.put("/{class_id}/class-teacher", response_model=ClassTeacherAssignmentResponse)
async def set_class_teacher(
    class_id: int,
    data: ClassTeacherAssignmentRequest,
    db: AsyncSession = Depends(get_db),
):
    """Assign, change, or clear the class teacher for a class.

    A teacher may be class teacher of at most one class at a time. If the
    supplied teacher is currently class teacher of another class, that
    other class is automatically cleared (class_teacher_id set to NULL)
    and reported in `cleared_classes` so the admin can assign a
    replacement. Passing teacher_id = null clears this class's class
    teacher.
    """
    school_class = await db.get(SchoolClass, class_id)
    if not school_class:
        raise ResourceNotFoundException("Class", str(class_id))

    cleared: list[ClearedClassInfo] = []

    if data.teacher_id is not None:
        teacher = await db.get(Teacher, data.teacher_id)
        if not teacher:
            raise ResourceNotFoundException("Teacher", str(data.teacher_id))
        if teacher.status != "ACTIVE":
            raise ValidationException(
                f"Teacher '{teacher.name}' is not ACTIVE "
                f"(current status: {teacher.status}). Approve the teacher "
                "before assigning them as a class teacher."
            )

        stmt = select(SchoolClass).where(
            SchoolClass.class_teacher_id == data.teacher_id,
            SchoolClass.id != class_id,
        )
        other_classes = list((await db.execute(stmt)).scalars().all())
        for c in other_classes:
            c.class_teacher_id = None
            cleared.append(
                ClearedClassInfo(
                    id=c.id, class_name=c.class_name, division=c.division
                )
            )

    school_class.class_teacher_id = data.teacher_id
    await db.commit()
    await db.refresh(school_class)

    return ClassTeacherAssignmentResponse(
        class_id=school_class.id,
        class_teacher_id=school_class.class_teacher_id,
        cleared_classes=cleared,
    )


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(class_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a class. Refuses if timetable slots or results reference it."""
    school_class = await db.get(SchoolClass, class_id)
    if not school_class:
        raise ResourceNotFoundException("Class", str(class_id))

    # Check for timetable slots referencing this class
    res_tt = await db.execute(
        select(TimetableSlot.id).where(TimetableSlot.class_id == class_id).limit(1)
    )
    if res_tt.scalar_one_or_none():
        raise ValidationException(
            "Cannot delete class with existing timetable or results."
        )

    # Check for results referencing this class (via student)
    res_res = await db.execute(
        select(Result.id)
        .join(Student, Result.student_id == Student.id)
        .where(Student.class_id == class_id)
        .limit(1)
    )
    if res_res.scalar_one_or_none():
        raise ValidationException(
            "Cannot delete class with existing timetable or results."
        )

    await db.delete(school_class)
    await db.commit()
    return None
