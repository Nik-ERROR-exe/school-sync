from dataclasses import dataclass, field
from typing import List, Dict, Optional

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

@dataclass
class SolverInput:
    teachers: List[SolverTeacher]
    classes: List[SolverClass]
    weekly_requirements: List[SolverRequirement]
    school_days: List[str]
    periods_per_day: int
    lunch_period: Optional[int]
    pt_subject_id: int
