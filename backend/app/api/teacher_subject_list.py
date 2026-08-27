from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.teacher_class import TeacherClass
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.subject_max_marks import SubjectMaxMarks

router = APIRouter(
    prefix="/teacher/subjects",
    tags=["Teacher - Subjects"],
)

@router.get("/")
@router.get("")
def list_all_subjects(
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns all subjects (read-only list).
    Teachers need this to look up subject names for their timetable grid display.
    """
    stmt = select(Subject).order_by(Subject.id)
    result = db.execute(stmt)
    subjects = result.scalars().all()
    return [
        {"id": s.id, "subject_name": s.subject_name, "code": s.code}
        for s in subjects
    ]


@router.get("/by-class/{class_id}")
def get_teacher_subjects_by_class(
    class_id: int,
    exam_type_id: Optional[int] = Query(None),
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns subjects taught by the current teacher in a specific class.
    If exam_type_id is provided, includes configured max_marks and needs_config status.
    Raises 403 Forbidden if teacher is not assigned to the class in TeacherClass.
    """
    # 1. Verify teacher assignment to this class
    is_assigned_class = db.execute(
        select(TeacherClass.id).where(
            TeacherClass.teacher_id == current_user.id,
            TeacherClass.class_id == class_id
        ).limit(1)
    ).scalar_one_or_none()

    if not is_assigned_class:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this class."
        )

    # 2. Get subjects taught by teacher in this class
    subject_ids = db.scalars(
        select(TeacherClassSubject.subject_id).where(
            TeacherClassSubject.teacher_id == current_user.id,
            TeacherClassSubject.class_id == class_id
        )
    ).all()

    if not subject_ids:
        return []

    subjects = db.scalars(
        select(Subject)
        .where(Subject.id.in_(subject_ids))
        .order_by(Subject.subject_name)
    ).all()

    # 3. If exam_type_id is provided, look up max marks for this class's standard (class_name)
    max_marks_map = {}
    if exam_type_id:
        school_class = db.get(SchoolClass, class_id)
        if school_class:
            records = db.scalars(
                select(SubjectMaxMarks).where(
                    SubjectMaxMarks.class_name == school_class.class_name,
                    SubjectMaxMarks.exam_type_id == exam_type_id,
                    SubjectMaxMarks.subject_id.in_(subject_ids)
                )
            ).all()
            max_marks_map = {r.subject_id: float(r.max_marks) for r in records}

    response = []
    for s in subjects:
        if exam_type_id is not None:
            configured_max = max_marks_map.get(s.id)
            response.append({
                "id": s.id,
                "subject_name": s.subject_name,
                "code": s.code,
                "max_marks": configured_max,
                "needs_config": configured_max is None
            })
        else:
            response.append({
                "id": s.id,
                "subject_name": s.subject_name,
                "code": s.code,
                "max_marks": None,
                "needs_config": False
            })

    return response


