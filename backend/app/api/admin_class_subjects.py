from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.subject import Subject  # ADD THIS IMPORT
from app.models.school_class import SchoolClass  # If needed
from app.schemas.teacher_class_subject import TeacherClassSubjectCreate, TeacherClassSubjectResponse

router = APIRouter(prefix="/admin/class-subjects", tags=["Admin - Class Subjects"])

@router.post("/", response_model=TeacherClassSubjectResponse, status_code=status.HTTP_201_CREATED)
def assign_teacher_class_subject(
    data: TeacherClassSubjectCreate,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(TeacherClassSubject).filter(
        TeacherClassSubject.teacher_id == data.teacher_id,
        TeacherClassSubject.class_id == data.class_id,
        TeacherClassSubject.subject_id == data.subject_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="This assignment already exists")
    
    assignment = TeacherClassSubject(
        teacher_id=data.teacher_id,
        class_id=data.class_id,
        subject_id=data.subject_id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

@router.get("/class/{class_id}", response_model=List[dict])
def get_class_subjects(
    class_id: int,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    results = db.query(
        TeacherClassSubject,
        Teacher.name.label("teacher_name"),
        Subject.subject_name.label("subject_name")
    ).join(
        Teacher, Teacher.id == TeacherClassSubject.teacher_id
    ).join(
        Subject, Subject.id == TeacherClassSubject.subject_id
    ).filter(
        TeacherClassSubject.class_id == class_id
    ).all()
    
    return [
        {
            "id": r[0].id,
            "teacher_id": r[0].teacher_id,
            "teacher_name": r[1],
            "subject_id": r[0].subject_id,
            "subject_name": r[2]
        }
        for r in results
    ]

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    id: int,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    assignment = db.query(TeacherClassSubject).filter(TeacherClassSubject.id == id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    db.delete(assignment)
    db.commit()
    return None