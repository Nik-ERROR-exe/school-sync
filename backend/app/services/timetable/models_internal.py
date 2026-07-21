from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

@dataclass
class SolverTeacher:
    id: int
    name: str
    subject_expertise: List[int]  # List of subject IDs this teacher can teach
    max_lectures_per_day: int = 4
    availability: Optional[Dict[str, List[int]]] = None  # Day -> List of available period numbers

@dataclass
class SolverClass:
    id: int
    class_name: str
    division: str

@dataclass
class SolverRequirement:
    class_id: int
    subject_id: int
    periods_per_week: int
    original_periods_per_week: Optional[int] = None  # Admin's original value before auto-adjustment

@dataclass
class SolverSlot:
    class_id: int
    day_of_week: str
    period_number: int
    subject_id: int
    teacher_id: int

@dataclass
class SolverInput:
    teachers: List[SolverTeacher]
    classes: List[SolverClass]
    weekly_requirements: List[SolverRequirement]
    school_days: List[str]
    periods_per_day: int
    lunch_period: Optional[int]
    pt_subject_id: int
    existing_slots: List[SolverSlot] = field(default_factory=list)
    class_subject_teachers: Dict[Tuple[int, int], List[int]] = field(default_factory=dict)  # (class_id, subject_id) -> [teacher_ids]