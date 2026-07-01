from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass

router = APIRouter(prefix="/admin/classes", tags=["Admin - Classes"])

@router.get("/")
def get_all_classes(
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all classes for admin"""
    classes = db.query(SchoolClass).order_by(SchoolClass.class_name, SchoolClass.division).all()
    return classes