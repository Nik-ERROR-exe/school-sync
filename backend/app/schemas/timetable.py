from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Tuple

class TeacherInput(BaseModel):
    id: int
    name: str
    subject_expertise: List[int]
    max_lectures_per_day: int = 4
    availability: Optional[Dict[str, List[int]]] = None

class ClassInput(BaseModel):
    id: int
    class_name: str
    division: str

class WeeklyRequirementInput(BaseModel):
    class_id: int
    subject_id: int
    periods_per_week: int

class TimetableGenerateRequest(BaseModel):
    teachers: Optional[List[TeacherInput]] = None
    classes: Optional[List[ClassInput]] = None
    weekly_requirements: Optional[List[WeeklyRequirementInput]] = None
    school_days: List[str] = Field(default=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
    saturday_periods: Optional[int] = None
    relax_teacher_caps: bool = False
    allow_gaps: bool = False
    periods_per_day: Optional[int] = None
    lunch_period: Optional[int] = None
    start_time: Optional[str] = None       # "HH:MM", display-only
    period_minutes: Optional[int] = None   # display-only
    pt_subject_id: int
    subject_teacher_assignments: Optional[Dict[str, int]] = None

class TimetableSlotResponse(BaseModel):
    class_id: int
    day_of_week: str
    period_number: int
    subject_id: int
    teacher_id: int

    class Config:
        from_attributes = True

class TimetableResponse(BaseModel):
    schedule: List[TimetableSlotResponse]
    success: bool
    message: Optional[str] = None
    relaxations: List[Dict] = []

class TimetableSaveRequest(BaseModel):
    slots: List[TimetableSlotResponse]


class TimetableSettingsSchema(BaseModel):
    school_days: List[str]
    saturday_periods: int = 4
    pt_subject_id: Optional[int] = None
    periods_per_day: Optional[int] = None
    lunch_period: Optional[int] = None
    start_time: Optional[str] = None
    period_minutes: Optional[int] = None
    lunch_minutes: Optional[int] = None


class SlotCalculationRequest(BaseModel):
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"
    period_minutes: int
    lunch_minutes: int


class SlotInfo(BaseModel):
    index: int
    start: str   # "HH:MM" 24h
    end: str     # "HH:MM" 24h
    label: str   # "7:10 – 7:50" 12h


class SlotCalculationResponse(BaseModel):
    periods_per_day: int
    slots: List[SlotInfo]
    actual_end: str          # "HH:MM" 24h — where the last period ends
    leftover_minutes: int    # minutes between actual_end and requested end_time
