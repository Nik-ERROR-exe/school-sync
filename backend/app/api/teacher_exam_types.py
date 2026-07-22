from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.exam_type import ExamType

router = APIRouter(prefix="/teacher/exam-types", tags=["Teacher - Exam Types"])

@router.get("")
@router.get("/")
def get_exam_types(
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exam_types = db.execute(select(ExamType).order_by(ExamType.id)).scalars().all()
    return [{"id": e.id, "name": e.name, "weightage": float(e.weightage)} for e in exam_types]