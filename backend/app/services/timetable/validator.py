from typing import List, Dict, Tuple, Any
from app.schemas.timetable import TimetableSlotResponse
from app.core.exceptions import ValidationException

def validate_timetable_slots(
    slots: List[TimetableSlotResponse],
    teachers_list: List[Any],  # Database Teacher models
    pt_subject_id: int
) -> None:
    """
    Validates manually edited timetable slots against the 4 core business constraints.
    Raises ValidationException if any constraint is violated.
    """
    # Create helper dictionary for teacher profiles to check daily limit constraints
    teachers_map = {t.id: t for t in teachers_list}
    
    class_period_check = set()
    teacher_period_check = set()
    
    # Track lecture counts per teacher per day: (teacher_id, day) -> count
    teacher_daily_count: Dict[Tuple[int, str], int] = {}
    
    # Track classes using the PT ground per slot: (day, period) -> count
    pt_period_count: Dict[Tuple[str, int], int] = {}
    
    for slot in slots:
        # 0 represents Free / Study periods (no teacher required, no constraints)
        if slot.subject_id == 0 or slot.teacher_id == 0:
            continue
            
        # Constraint: A class cannot have two subjects at the same period
        class_key = (slot.class_id, slot.day_of_week, slot.period_number)
        if class_key in class_period_check:
            raise ValidationException(
                f"Double scheduling: Class (ID: {slot.class_id}) has multiple lectures scheduled at "
                f"{slot.day_of_week} Period {slot.period_number}."
            )
        class_period_check.add(class_key)
        
        # Constraint 1: A single teacher cannot have overlapping lectures
        teacher_key = (slot.teacher_id, slot.day_of_week, slot.period_number)
        if teacher_key in teacher_period_check:
            t_name = teachers_map[slot.teacher_id].name if slot.teacher_id in teachers_map else f"ID {slot.teacher_id}"
            raise ValidationException(
                f"Teacher Overlap: Teacher '{t_name}' is scheduled in multiple classes during "
                f"{slot.day_of_week} Period {slot.period_number}."
            )
        teacher_period_check.add(teacher_key)
        
        # Constraint 3: No teacher exceeds their max lectures limit
        teacher_daily_key = (slot.teacher_id, slot.day_of_week)
        teacher_daily_count[teacher_daily_key] = teacher_daily_count.get(teacher_daily_key, 0) + 1
        
        if slot.teacher_id in teachers_map:
            max_limit = teachers_map[slot.teacher_id].max_lectures_per_day
            if teacher_daily_count[teacher_daily_key] > max_limit:
                raise ValidationException(
                    f"Lecture Limit Exceeded: Teacher '{teachers_map[slot.teacher_id].name}' exceeds the daily limit "
                    f"of {max_limit} lectures on {slot.day_of_week}."
                )
                
        # Constraint 4: PT ground capacity limit (only 2 classes can have PT simultaneously)
        if slot.subject_id == pt_subject_id:
            pt_key = (slot.day_of_week, slot.period_number)
            pt_period_count[pt_key] = pt_period_count.get(pt_key, 0) + 1
            if pt_period_count[pt_key] > 2:
                raise ValidationException(
                    f"PT Ground Capacity Limit Exceeded: More than 2 classes are assigned PT during "
                    f"{slot.day_of_week} Period {slot.period_number}."
                )
