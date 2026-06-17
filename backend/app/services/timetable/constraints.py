from typing import Dict, Tuple, Optional
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
            
    return count < max_lectures

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
