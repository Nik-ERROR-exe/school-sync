from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.exam_type import ExamType

router = APIRouter(prefix="/teacher/exam-types", tags=["Teacher - Exam Types"])

@router.get("/")
def get_exam_types(
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all exam types"""
    exam_types = db.query(ExamType).order_by(ExamType.name).all()
    return exam_types