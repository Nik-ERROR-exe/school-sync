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

def check_teacher_back_to_back(
    teacher_id: int,
    day: str,
    period: int,
    assignments: Dict[Tuple[int, str, int], Tuple[int, int]]
) -> bool:
    """
    Constraint: A teacher cannot teach two consecutive periods on the same day,
    even in different classes.
    Returns True if valid (no back-to-back lectures), False otherwise.
    """
    if not teacher_id:  # Empty / free period
        return True

    for (c_id, d, p), (s_id, t_id) in assignments.items():
        if t_id == teacher_id and d == day and p in (period - 1, period + 1):
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
    Returns False if either the IMMEDIATELY preceding or the IMMEDIATELY
    following period on the same day already has the same subject for this class.
    Prevents double-periods of the same subject regardless of slot ordering.
    """
    if subject_id == 0:
        return True  # Free periods can be consecutive, no restriction

    for neighbor_period in (period - 1, period + 1):
        if neighbor_period < 1:
            continue  # No such period exists
        neighbor_key = (class_id, day, neighbor_period)
        if neighbor_key not in assignments:
            continue  # Not assigned yet, nothing to conflict with
        neighbor_subject_id, _ = assignments[neighbor_key]
        if neighbor_subject_id == subject_id:
            return False  # Conflict (same subject in adjacent period)

    return True  # True = OK (no adjacent same subject)


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

    return count < max_per_day

