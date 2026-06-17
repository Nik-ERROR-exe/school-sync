from datetime import date as pydate
from typing import List, Optional, Tuple, Any
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.teacher import Teacher
from app.models.timetable import TimetableSlot
from app.models.substitute_assignment import SubstituteAssignment
from app.models.school_class import SchoolClass
from app.schemas.substitute import AvailableTeacherResponse
from app.core.exceptions import ValidationException, ResourceNotFoundException

async def find_available_substitutes(
    db: AsyncSession,
    absent_date: pydate,
    period_number: int,
    absent_teacher_id: int
) -> Tuple[Optional[TimetableSlot], List[AvailableTeacherResponse]]:
    """
    Finds the class requiring a substitute for the absent teacher at the given period and date,
    then identifies eligible substitute teachers who are free and haven't reached their daily limit.
    """
    day_name = absent_date.strftime("%A")  # 'Monday', 'Tuesday', etc.
    
    # 1. Fetch the master timetable slot that needs substitution
    slot_stmt = select(TimetableSlot).options(
        joinedload(TimetableSlot.school_class)
    ).where(
        TimetableSlot.teacher_id == absent_teacher_id,
        TimetableSlot.day_of_week == day_name,
        TimetableSlot.period_number == period_number
    )
    
    slot_res = await db.execute(slot_stmt)
    slot_to_sub = slot_res.scalar_one_or_none()
    
    if not slot_to_sub:
        return None, []
        
    # 2. Query other ACTIVE teachers who can serve as candidates
    teachers_stmt = select(Teacher).where(
        Teacher.id != absent_teacher_id,
        Teacher.status == "ACTIVE"
    )
    teachers_res = await db.execute(teachers_stmt)
    candidates = teachers_res.scalars().all()
    
    available_teachers = []
    
    for candidate in candidates:
        # Check if they are teaching in the master timetable at this exact time
        master_slot_stmt = select(TimetableSlot).where(
            TimetableSlot.teacher_id == candidate.id,
            TimetableSlot.day_of_week == day_name,
            TimetableSlot.period_number == period_number
        )
        master_slot = (await db.execute(master_slot_stmt)).scalar_one_or_none()
        
        # Check if they are already subbing in another class at this exact time
        sub_slot_stmt = select(SubstituteAssignment).where(
            SubstituteAssignment.substitute_teacher_id == candidate.id,
            SubstituteAssignment.date == absent_date,
            SubstituteAssignment.period_number == period_number
        )
        is_subbing = (await db.execute(sub_slot_stmt)).scalar_one_or_none() is not None
        
        # If they have a timetable class OR are subbing, they are busy
        if master_slot or is_subbing:
            continue
            
        # Compute their current total lecture load on this date:
        # Lectures = (Master slots on this day) - (Absences on this date) + (Substitutions on this date)
        
        # a. Master slots
        master_count_stmt = select(func.count(TimetableSlot.id)).where(
            TimetableSlot.teacher_id == candidate.id,
            TimetableSlot.day_of_week == day_name
        )
        master_count = (await db.execute(master_count_stmt)).scalar() or 0
        
        # b. Absences on this date
        absences_count_stmt = select(func.count(SubstituteAssignment.id)).where(
            SubstituteAssignment.original_teacher_id == candidate.id,
            SubstituteAssignment.date == absent_date
        )
        absences_count = (await db.execute(absences_count_stmt)).scalar() or 0
        
        # c. Substitutions on this date
        subs_count_stmt = select(func.count(SubstituteAssignment.id)).where(
            SubstituteAssignment.substitute_teacher_id == candidate.id,
            SubstituteAssignment.date == absent_date
        )
        subs_count = (await db.execute(subs_count_stmt)).scalar() or 0
        
        actual_lectures = master_count - absences_count + subs_count
        
        if actual_lectures < candidate.max_lectures_per_day:
            available_teachers.append(
                AvailableTeacherResponse(
                    id=candidate.id,
                    teacher_id=candidate.teacher_id,
                    name=candidate.name,
                    email=candidate.email,
                    max_lectures_per_day=candidate.max_lectures_per_day,
                    current_lectures_on_date=actual_lectures
                )
            )
            
    return slot_to_sub, available_teachers

async def assign_substitute(
    db: AsyncSession,
    date: pydate,
    period_number: int,
    class_id: int,
    original_teacher_id: int,
    substitute_teacher_id: int,
    background_tasks: Optional[Any] = None
) -> SubstituteAssignment:
    """
    Creates a substitute assignment, writes it to the database, and fires a notification
    to the chosen substitute teacher.
    """
    # Verify candidate is not already assigned as a sub for this period
    existing_sub_stmt = select(SubstituteAssignment).where(
        SubstituteAssignment.date == date,
        SubstituteAssignment.period_number == period_number,
        SubstituteAssignment.substitute_teacher_id == substitute_teacher_id
    )
    existing_sub = (await db.execute(existing_sub_stmt)).scalar_one_or_none()
    if existing_sub:
        raise ValidationException("The selected substitute teacher is already subbing at this period.")

    # Create the assignment
    assignment = SubstituteAssignment(
        date=date,
        period_number=period_number,
        class_id=class_id,
        original_teacher_id=original_teacher_id,
        substitute_teacher_id=substitute_teacher_id,
        status="notified"
    )
    db.add(assignment)
    await db.commit()
    
    # Reload with details for notifications and response
    stmt = select(SubstituteAssignment).options(
        joinedload(SubstituteAssignment.school_class),
        joinedload(SubstituteAssignment.original_teacher),
        joinedload(SubstituteAssignment.substitute_teacher)
    ).where(SubstituteAssignment.id == assignment.id)
    
    assignment_loaded = (await db.execute(stmt)).scalar()
    if not assignment_loaded:
        raise ResourceNotFoundException("SubstituteAssignment", str(assignment.id))

    # Send Notification to the substitute teacher
    message = (
        f"Notice: You have been assigned to cover Class "
        f"{assignment_loaded.school_class.class_name}{assignment_loaded.school_class.division} "
        f"on {date} during Period {period_number} for absent teacher {assignment_loaded.original_teacher.name}."
    )
    
    from app.services.notification_service import create_notification
    await create_notification(
        db=db,
        user_id=substitute_teacher_id,
        message=message,
        notification_type="substitute_assignment",
        background_tasks=background_tasks
    )

    return assignment_loaded
