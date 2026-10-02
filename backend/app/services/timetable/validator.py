from typing import List, Dict, Tuple, Any
from app.schemas.timetable import TimetableSlotResponse
from app.core.exceptions import ValidationException

def validate_timetable_slots(
    slots: List[TimetableSlotResponse],
    teachers_list: List[Any],  # Database Teacher models
    pt_subject_id: int,
    class_teacher_map: Dict[int, int],
) -> None:
    """
    Validates manually edited timetable slots against the 4 core business constraints.
    Raises ValidationException if any constraint is violated.

    class_teacher_map is {class_id: class_teacher_id} for the classes being
    saved. Classes with no assigned class teacher are absent from the map.
    """
    # Create helper dictionary for teacher profiles to check daily limit constraints
    teachers_map = {t.id: t for t in teachers_list}
    
    class_period_check = set()
    teacher_period_map: Dict[Tuple[int, str, int], int] = {}
    teacher_daily_count: Dict[Tuple[int, str], int] = {}
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
        if teacher_key in teacher_period_map:
            other_class_id = teacher_period_map[teacher_key]
            t_name = teachers_map[slot.teacher_id].name if slot.teacher_id in teachers_map else f"ID {slot.teacher_id}"
            raise ValidationException(
                f"Teacher Overlap: Teacher '{t_name}' is scheduled in multiple classes (Class ID {other_class_id} and Class ID {slot.class_id}) during "
                f"{slot.day_of_week} Period {slot.period_number}."
            )
        teacher_period_map[teacher_key] = slot.class_id
        
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

    # --- Class-teacher period 1 rule ---
    # Every (class, day) with period 1 present must have the class teacher.
    # Classes absent from class_teacher_map have no assigned class teacher
    # and are rejected explicitly rather than skipped.
    for slot in slots:
        if slot.period_number != 1:
            continue
        if slot.class_id not in class_teacher_map:
            raise ValidationException(
                f"Class id {slot.class_id} has no class teacher assigned. "
                f"Assign a class teacher before saving the timetable."
            )
        expected = class_teacher_map[slot.class_id]
        if slot.teacher_id != expected:
            raise ValidationException(
                f"Period 1 of class id {slot.class_id} on {slot.day_of_week} "
                f"is assigned to teacher id {slot.teacher_id}, but the class "
                f"teacher is teacher id {expected}. Period 1 must be taught "
                f"by the class teacher."
            )

