from typing import Dict, Tuple, Optional
import math
from app.services.timetable.models_internal import SolverTeacher


def check_teacher_overlap(
    teacher_id: int,
    day: str,
    period: int,
    assignments: Dict[Tuple[int, str, int], Tuple[int, int]]
) -> bool:
    """
    Constraint 1: A single teacher cannot have two overlapping lectures in the same period.
    Returns True if valid (no overlap), False otherwise.
    """
    if not teacher_id:  # Empty / free period
        return True
        
    for (c_id, d, p), (s_id, t_id) in assignments.items():
        if d == day and p == period and t_id == teacher_id:
            return False
            
    return True

def check_teacher_daily_limit(
    teacher_id: int,
    day: str,
    max_lectures: int,
    assignments: Dict[Tuple[int, str, int], Tuple[int, int]]
) -> bool:
    """
    Constraint 3: No teacher exceeds their max_lectures_per_day limit.
    Returns True if valid (within limit), False otherwise.
    """
    if not teacher_id:
        return True
        
    count = 0
    for (c_id, d, p), (s_id, t_id) in assignments.items():
        if d == day and t_id == teacher_id:
            count += 1
            
    return count <= max_lectures

def check_pt_capacity(
    pt_subject_id: int,
    day: str,
    period: int,
    assignments: Dict[Tuple[int, str, int], Tuple[int, int]]
) -> bool:
    """
    Constraint 4: The PT (Physical Training) ground has a capacity limit.
    ONLY 2 classes can have PT simultaneously.
    Returns True if valid (capacity not exceeded), False otherwise.
    """
    count = 0
    for (c_id, d, p), (s_id, t_id) in assignments.items():
        if d == day and p == period and s_id == pt_subject_id:
            count += 1
            
    return count < 2

def check_teacher_availability(
    teacher: SolverTeacher,
    day: str,
    period: int
) -> bool:
    """
    Checks if a teacher is available to teach at a specific period.
    Returns True if available, False otherwise.
    """
    if not teacher.availability:
        return True
        
    available_periods = teacher.availability.get(day)
    if available_periods is None:
        # If the day isn't listed, assume they are available by default unless specified
        return True
        
    return period in available_periods


def check_no_consecutive_same_subject(
    class_id: int,
    subject_id: int,
    day: str,
    period: int,
    assignments: Dict[Tuple[int, str, int], Tuple[int, int]]
) -> bool:
    """
    Returns False if the IMMEDIATELY preceding period on the same day
    already has the same subject for this class.
    Prevents double-periods of the same subject.
    """
    if subject_id == 0:
        return True  # Free periods can be consecutive, no restriction
    
    prev_period = period - 1
    if prev_period < 1:
        return True  # No previous period exists
    
    prev_key = (class_id, day, prev_period)
    if prev_key not in assignments:
        return True  # Previous period not yet assigned (shouldn't happen in period-first order)
    
    prev_subject_id, _ = assignments[prev_key]
    return prev_subject_id != subject_id  # True = OK (different), False = conflict (same)


def check_subject_daily_limit(
    class_id: int,
    subject_id: int,
    day: str,
    periods_per_week: int,
    num_school_days: int,
    assignments: Dict[Tuple[int, str, int], Tuple[int, int]]
) -> bool:
    """
    Returns False if this class already has this subject the maximum
    number of times allowed on this day.
    Max per day = ceil(periods_per_week / num_school_days)
    """
    if subject_id == 0:
        return True  # No limit on free periods
    
    max_per_day = math.ceil(periods_per_week / num_school_days)
    
    # Count how many times this subject already appears for this class on this day
    count = sum(
        1 for (cid, d, _), (sid, _) in assignments.items()
        if cid == class_id and d == day and sid == subject_id
    )
    
    return count <= max_per_day

