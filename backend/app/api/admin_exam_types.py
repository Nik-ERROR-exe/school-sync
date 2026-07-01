from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.models.exam_type import ExamType
from app.schemas.exam_type import ExamTypeCreate, ExamTypeUpdate, ExamTypeResponse
from app.core.exceptions import ResourceNotFoundException, ConflictException

router = APIRouter(
    prefix="/admin/exam-types",
    tags=["Admin - Exam Types"],
    dependencies=[Depends(require_admin)]
)


@router.post("/", response_model=ExamTypeResponse, status_code=status.HTTP_201_CREATED)
def create_exam_type(
    data: ExamTypeCreate,
    db: Session = Depends(get_db)
):
    """Create a new exam type"""
    # Check if exam type already exists
    existing = db.query(ExamType).filter(ExamType.name == data.name).first()
    if existing:
        raise ConflictException(f"Exam type '{data.name}' already exists")
    
    exam_type = ExamType(
        name=data.name,
        weightage=data.weightage
    )
    db.add(exam_type)
    db.commit()
    db.refresh(exam_type)
    return exam_type


@router.get("/", response_model=List[ExamTypeResponse])
def list_exam_types(
    db: Session = Depends(get_db)
):
    """Get all exam types"""
    exam_types = db.query(ExamType).order_by(ExamType.name).all()
    return exam_types


@router.get("/{id}", response_model=ExamTypeResponse)
def get_exam_type(
    id: int,
    db: Session = Depends(get_db)
):
    """Get exam type by ID"""
    exam_type = db.query(ExamType).filter(ExamType.id == id).first()
    if not exam_type:
        raise ResourceNotFoundException("Exam Type", str(id))
    return exam_type


@router.put("/{id}", response_model=ExamTypeResponse)
def update_exam_type(
    id: int,
    data: ExamTypeUpdate,
    db: Session = Depends(get_db)
):
    """Update exam type"""
    exam_type = db.query(ExamType).filter(ExamType.id == id).first()
    if not exam_type:
        raise ResourceNotFoundException("Exam Type", str(id))
    
    # Check if name conflicts with another exam type
    if data.name:
        existing = db.query(ExamType).filter(
            ExamType.name == data.name,
            ExamType.id != id
        ).first()
        if existing:
            raise ConflictException(f"Exam type '{data.name}' already exists")
        exam_type.name = data.name
    
    if data.weightage is not None:
        exam_type.weightage = data.weightage
    
    db.commit()
    db.refresh(exam_type)
    return exam_type


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam_type(
    id: int,
    db: Session = Depends(get_db)
):
    """Delete exam type"""
    exam_type = db.query(ExamType).filter(ExamType.id == id).first()
    if not exam_type:
        raise ResourceNotFoundException("Exam Type", str(id))
    
    # Check if exam type is being used in results
    if exam_type.results:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete exam type as it is being used in results"
        )
    
    db.delete(exam_type)
    db.commit()
    return None