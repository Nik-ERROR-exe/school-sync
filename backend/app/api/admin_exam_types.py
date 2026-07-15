from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.exam_type import ExamTypeCreate, ExamTypeResponse
from app.models.exam_type import ExamType
from app.core.exceptions import ResourceNotFoundException

router = APIRouter(
    prefix="/admin/exam-types",
    tags=["Admin - Exam Type Management"],
    dependencies=[Depends(require_admin)]
)

@router.post("/", response_model=ExamTypeResponse, status_code=status.HTTP_201_CREATED)
def create_exam_type(data: ExamTypeCreate, db: Session = Depends(get_db)):
    """
    Creates a new exam type (e.g. Midterm, Quiz, Final) with weightage.
    """
    db_exam = ExamType(name=data.name, weightage=data.weightage)
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

@router.get("/", response_model=List[ExamTypeResponse])
def list_exam_types(db: Session = Depends(get_db)):
    """
    Lists all available exam types.
    """
    stmt = select(ExamType).order_by(ExamType.id)
    res = db.execute(stmt)
    return list(res.scalars().all())

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam_type(id: int, db: Session = Depends(get_db)):
    """
    Deletes an exam type.
    """
    exam = db.get(ExamType, id)
    if not exam:
        raise ResourceNotFoundException("ExamType", str(id))
    db.delete(exam)
    db.commit()
    return None
