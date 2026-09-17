import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, cast, Integer, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.school_class import SchoolClass
from app.core.class_sorter import sort_classes_natural

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/admin/promotion", tags=["Admin - Promotion"])

@router.get("/summary")
async def get_promotion_summary(
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Return total students per standard (class), aggregated across divisions."""
    stmt = (
        select(SchoolClass.class_name, func.count(Student.id))
        .outerjoin(Student, Student.class_id == SchoolClass.id)
        .group_by(SchoolClass.class_name)
    )
    res = await db.execute(stmt)
    rows = [r for r in res.all() if r[0] and str(r[0]).isdigit()]
    rows.sort(key=lambda r: int(r[0]))  # numeric order: 1..10
    return [{"class_name": name, "total_students": count} for name, count in rows]


@router.get("/preview")
async def get_promotion_preview(
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get promotion preview for all students (2 queries total, no N+1)."""
    classes_res = await db.execute(select(SchoolClass))
    classes = classes_res.scalars().all()
    class_by_id = {c.id: c for c in classes}
    class_by_key = {(c.class_name, c.division): c for c in classes}

    students_res = await db.execute(select(Student))
    students = students_res.scalars().all()

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

    return sort_classes_natural(preview)

@router.post("/execute")
async def execute_promotion(
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Execute promotion for all students.
    - Class 10 students: Graduated (deleted)
    - Class 1-9 students: Promoted to next class (A→A, B→B)
    - Roll numbers stay the SAME if possible
    - If duplicate roll numbers exist, auto-assign new ones
    """
    
    # Step 1: Graduate Class 10 students (delete them)
    res_10 = await db.execute(select(SchoolClass.id).where(SchoolClass.class_name == "10"))
    class_10_ids = res_10.scalars().all()
    
    graduated_count = 0
    if class_10_ids:
        res_students_10 = await db.execute(select(Student).where(Student.class_id.in_(class_10_ids)))
        for student in res_students_10.scalars().all():
            await db.delete(student)
            graduated_count += 1
    
    await db.commit()
    logger.info("Graduated %d students from Class 10", graduated_count)
    
    # Step 2: Promote remaining students (9→8→7→...→1)
    promoted_count = 0
    roll_updated_count = 0
    
    # Process from highest class to lowest to avoid conflicts
    for class_num in range(9, 0, -1):
        source_classes_res = await db.execute(
            select(SchoolClass).where(SchoolClass.class_name == str(class_num))
        )
        source_classes = source_classes_res.scalars().all()
        
        for source_class in source_classes:
            next_class_num = class_num + 1
            next_class_res = await db.execute(
                select(SchoolClass).where(
                    SchoolClass.class_name == str(next_class_num),
                    SchoolClass.division == source_class.division  # A→A, B→B
                )
            )
            next_class = next_class_res.scalars().first()
            
            if not next_class:
                logger.warning("Class %d%s not found during promotion", next_class_num, source_class.division)
                continue
            
            # Get students from source class (sorted by roll_no)
            class_students_res = await db.execute(
                select(Student)
                .where(Student.class_id == source_class.id)
                .order_by(cast(Student.roll_no, Integer))
            )
            class_students = class_students_res.scalars().all()
            
            # Get existing roll numbers in destination class
            existing_rolls_res = await db.execute(
                select(Student.roll_no).where(Student.class_id == next_class.id)
            )
            existing_rolls = [int(r[0]) for r in existing_rolls_res.all() if r[0] and str(r[0]).isdigit()]
            
            for student in class_students:
                new_roll = student.roll_no
                
                # Check if roll_no already exists in destination class
                if new_roll and str(new_roll).isdigit() and int(new_roll) in existing_rolls:
                    # Find next available roll number
                    next_available = 1
                    while next_available in existing_rolls:
                        next_available += 1
                    new_roll = str(next_available)
                    existing_rolls.append(next_available)
                    roll_updated_count += 1
                    logger.info("Roll number changed: %s (%s -> %s)", student.name, student.roll_no, new_roll)
                else:
                    # Keep original roll number
                    if new_roll and str(new_roll).isdigit():
                        existing_rolls.append(int(new_roll))
                
                # Move to next class with the new/updated roll number
                student.roll_no = str(new_roll)
                student.class_id = next_class.id
                promoted_count += 1
                logger.info("Promoted %s (Roll: %s) -> %d%s", student.name, student.roll_no, next_class_num, source_class.division)
    
    await db.commit()
    
    return {
        "message": "Promotion completed successfully",
        "promoted_count": promoted_count,
        "graduated_count": graduated_count,
        "roll_updated_count": roll_updated_count
    }