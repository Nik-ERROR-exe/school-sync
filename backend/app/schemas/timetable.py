from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class TeacherInput(BaseModel):
    id: int
    name: str
    subject_expertise: List[int]  # List of subject IDs
    max_lectures_per_day: int = 4
    availability: Optional[Dict[str, List[int]]] = None  # Day -> List of available period numbers

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
    periods_per_day: int = Field(default=6, ge=1)
    lunch_period: Optional[int] = Field(default=4)
    pt_subject_id: int

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

class TimetableSaveRequest(BaseModel):
    slots: List[TimetableSlotResponse]
