from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.schemas.teacher_class_subject import (
    TeacherClassSubjectBatchCreate,
    TeacherClassSubjectResponse,
)

router = APIRouter(prefix="/admin/class-subjects", tags=["Admin - Class Subjects"])

@router.get("/class/{class_id}", response_model=List[TeacherClassSubjectResponse])
async def get_class_subjects(
    class_id: int,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(TeacherClassSubject, SchoolClass, Subject)
        .join(SchoolClass, TeacherClassSubject.class_id == SchoolClass.id)
        .join(Subject, TeacherClassSubject.subject_id == Subject.id)
        .filter(TeacherClassSubject.class_id == class_id)
    )
    result = await db.execute(stmt)
    rows = result.all()

    results = []
    for tcs, sc, sub in rows:
        results.append(
            TeacherClassSubjectResponse(
                id=tcs.id,
                teacher_id=tcs.teacher_id,
                class_id=tcs.class_id,
                subject_id=tcs.subject_id,
                class_name=sc.class_name,
                division=sc.division,
                subject_name=sub.subject_name,
                code=sub.code,
            )
        )
    return results

@router.post("/", response_model=List[TeacherClassSubjectResponse], status_code=status.HTTP_201_CREATED)
async def assign_teacher_class_subject(
    data: TeacherClassSubjectBatchCreate,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Assignments are managed via /admin/teachers/{id}/class-subjects.
    # Keep this endpoint returning empty list for backward compatibility.
    return []