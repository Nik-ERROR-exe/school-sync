from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass

router = APIRouter(prefix="/teacher/classes", tags=["Teacher - Classes"])

@router.get("/my-classes")
def get_my_classes(
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ALL classes (1A to 10B) for any teacher"""
    # Return ALL classes, not just teacher-specific
    classes = db.query(SchoolClass).order_by(SchoolClass.class_name, SchoolClass.division).all()
    return classes