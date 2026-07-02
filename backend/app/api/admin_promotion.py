from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.school_class import SchoolClass

router = APIRouter(prefix="/admin/promotion", tags=["Admin - Promotion"])

@router.get("/preview")
def get_promotion_preview(
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get promotion preview for all students"""
    students = db.query(Student).all()
    classes = db.query(SchoolClass).all()
    
    preview = []
    for student in students:
        current_class = db.query(SchoolClass).filter(SchoolClass.id == student.class_id).first()
        if not current_class:
            continue
        
        class_num = int(current_class.class_name)
        division = current_class.division
        
        if class_num == 10:
            # Graduated
            preview.append({
                "student_id": student.id,
                "roll_no": student.roll_no,
                "student_name": student.name,
                "current_class": f"{class_num}{division}",
                "movement": "→",
                "next_class": "🎓 Graduated",
                "action": "graduate"
            })
        else:
            # Find next class
            next_class_num = class_num + 1
            next_class = db.query(SchoolClass).filter(
                SchoolClass.class_name == str(next_class_num),
                SchoolClass.division == division
            ).first()
            
            next_class_name = f"{next_class_num}{division}" if next_class else f"{next_class_num}{division}"
            next_class_id = next_class.id if next_class else None
            
            preview.append({
                "student_id": student.id,
                "roll_no": student.roll_no,
                "student_name": student.name,
                "current_class": f"{class_num}{division}",
                "movement": "→",
                "next_class": next_class_name,
                "action": "promote",
                "next_class_id": next_class_id
            })
    
    return preview

@router.post("/execute")
def execute_promotion(
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Execute promotion for all students"""
    students = db.query(Student).all()
    
    promoted_count = 0
    graduated_count = 0
    
    for student in students:
        current_class = db.query(SchoolClass).filter(SchoolClass.id == student.class_id).first()
        if not current_class:
            continue
        
        class_num = int(current_class.class_name)
        division = current_class.division
        
        if class_num == 10:
            # Graduate student - delete from system
            db.delete(student)
            graduated_count += 1
        else:
            # Promote to next class
            next_class_num = class_num + 1
            next_class = db.query(SchoolClass).filter(
                SchoolClass.class_name == str(next_class_num),
                SchoolClass.division == division
            ).first()
            
            if next_class:
                student.class_id = next_class.id
                promoted_count += 1
    
    db.commit()
    
    return {
        "message": "Promotion completed successfully",
        "promoted_count": promoted_count,
        "graduated_count": graduated_count
    }