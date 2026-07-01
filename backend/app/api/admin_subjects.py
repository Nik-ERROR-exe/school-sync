from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.teacher_class_subject import TeacherClassSubject
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse

router = APIRouter(prefix="/admin/subjects", tags=["Admin - Subjects"])

# Get all subjects (for admin)
@router.get("/", response_model=List[SubjectResponse])
def get_all_subjects(
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    subjects = db.query(Subject).order_by(Subject.subject_name).all()
    return subjects

# Get subjects for a specific class
@router.get("/class/{class_id}", response_model=List[SubjectResponse])
def get_subjects_by_class(
    class_id: int,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    subjects = db.query(Subject).join(
        TeacherClassSubject, TeacherClassSubject.subject_id == Subject.id
    ).filter(
        TeacherClassSubject.class_id == class_id
    ).order_by(Subject.subject_name).all()
    return subjects

# Add subject to class
@router.post("/class/{class_id}")
def add_subject_to_class(
    class_id: int,
    subject_id: int,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Check if already exists
    existing = db.query(TeacherClassSubject).filter(
        TeacherClassSubject.class_id == class_id,
        TeacherClassSubject.subject_id == subject_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Subject already assigned")
    
    new_mapping = TeacherClassSubject(
        class_id=class_id,
        subject_id=subject_id,
        teacher_id=None
    )
    db.add(new_mapping)
    db.commit()
    
    return {"message": "Subject added to class successfully"}

# Create a new subject
@router.post("/", response_model=SubjectResponse)
def create_subject(
    data: SubjectCreate,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new subject"""
    existing = db.query(Subject).filter(Subject.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")
    
    new_subject = Subject(
        subject_name=data.subject_name,
        code=data.code
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

# Remove subject from a class
@router.delete("/class/{class_id}/subject/{subject_id}")
def remove_subject_from_class(
    class_id: int,
    subject_id: int,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    mapping = db.query(TeacherClassSubject).filter(
        TeacherClassSubject.class_id == class_id,
        TeacherClassSubject.subject_id == subject_id
    ).first()
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Subject not found in this class")
    
    db.delete(mapping)
    db.commit()
    
    return {"message": "Subject removed from class successfully"}