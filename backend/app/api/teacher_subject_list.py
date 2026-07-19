from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.subject import Subject

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
