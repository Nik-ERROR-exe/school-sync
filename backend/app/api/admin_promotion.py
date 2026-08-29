from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, cast, Integer
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.school_class import SchoolClass

router = APIRouter(prefix="/admin/promotion", tags=["Admin - Promotion"])

@router.get("/summary")
def get_promotion_summary(
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Return total students per standard (class), aggregated across divisions."""
    rows = (
        db.query(SchoolClass.class_name, func.count(Student.id))
        .outerjoin(Student, Student.class_id == SchoolClass.id)
        .filter(SchoolClass.class_name.isdigit())  # standards only
        .group_by(SchoolClass.class_name)
        .all()
    )
    rows.sort(key=lambda r: int(r[0]))  # numeric order: 1..10
    return [{"class_name": name, "total_students": count} for name, count in rows]


@router.get("/preview")
def get_promotion_preview(
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get promotion preview for all students (2 queries total, no N+1)."""
    classes = db.query(SchoolClass).all()
    class_by_id = {c.id: c for c in classes}
    class_by_key = {(c.class_name, c.division): c for c in classes}

    students = db.query(Student).all()

    preview = []
    for student in students:
        current_class = class_by_id.get(student.class_id)
        if not current_class or not current_class.class_name.isdigit():
            # Skip non-numeric classes (e.g. KG) — not part of the standard promotion flow
            continue

        class_num = int(current_class.class_name)
        division = current_class.division

        if class_num == 10:
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
            next_class_num = class_num + 1
            next_class = class_by_key.get((str(next_class_num), division))

            next_class_id = next_class.id if next_class else None
            preview.append({
                "student_id": student.id,
                "roll_no": student.roll_no,
                "student_name": student.name,
                "current_class": f"{class_num}{division}",
                "movement": "→",
                "next_class": f"{next_class_num}{division}",
                "action": "promote",
                "next_class_id": next_class_id
            })

    return preview

@router.post("/execute")
def execute_promotion(
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Execute promotion for all students.
    - Class 10 students: Graduated (deleted)
    - Class 1-9 students: Promoted to next class (A→A, B→B)
    - Roll numbers stay the SAME if possible
    - If duplicate roll numbers exist, auto-assign new ones
    """
    
    # Step 1: Graduate Class 10 students (delete them)
    class_10_ids = db.query(SchoolClass.id).filter(SchoolClass.class_name == "10").all()
    class_10_ids = [c[0] for c in class_10_ids]
    
    graduated_count = 0
    for student in db.query(Student).filter(Student.class_id.in_(class_10_ids)).all():
        db.delete(student)
        graduated_count += 1
    
    db.commit()
    print(f"✅ Graduated {graduated_count} students from Class 10")
    
    # Step 2: Promote remaining students (9→8→7→...→1)
    promoted_count = 0
    roll_updated_count = 0
    
    # Process from highest class to lowest to avoid conflicts
    for class_num in range(9, 0, -1):
        source_classes = db.query(SchoolClass).filter(
            SchoolClass.class_name == str(class_num)
        ).all()
        
        for source_class in source_classes:
            next_class_num = class_num + 1
            next_class = db.query(SchoolClass).filter(
                SchoolClass.class_name == str(next_class_num),
                SchoolClass.division == source_class.division  # A→A, B→B
            ).first()
            
            if not next_class:
                print(f"⚠️ Class {next_class_num}{source_class.division} not found")
                continue
            
            # Get students from source class (sorted by roll_no)
            class_students = db.query(Student).filter(
                Student.class_id == source_class.id
            ).order_by(cast(Student.roll_no, Integer)).all()
            
            # Get existing roll numbers in destination class
            existing_rolls = db.query(Student.roll_no).filter(
                Student.class_id == next_class.id
            ).all()
            existing_rolls = [int(r[0]) for r in existing_rolls if r[0].isdigit()]
            
            for student in class_students:
                new_roll = student.roll_no
                
                # Check if roll_no already exists in destination class
                if new_roll.isdigit() and int(new_roll) in existing_rolls:
                    # Find next available roll number
                    next_available = 1
                    while next_available in existing_rolls:
                        next_available += 1
                    new_roll = str(next_available)
                    existing_rolls.append(next_available)
                    roll_updated_count += 1
                    print(f"⚠️ Roll number changed: {student.name} ({student.roll_no} → {new_roll})")
                else:
                    # Keep original roll number
                    if new_roll.isdigit():
                        existing_rolls.append(int(new_roll))
                
                # Move to next class with the new/updated roll number
                student.roll_no = new_roll
                student.class_id = next_class.id
                promoted_count += 1
                print(f"✅ {student.name} (Roll: {student.roll_no}) → {next_class_num}{source_class.division}")
    
    db.commit()
    
    return {
        "message": "Promotion completed successfully",
        "promoted_count": promoted_count,
        "graduated_count": graduated_count,
        "roll_updated_count": roll_updated_count
    }