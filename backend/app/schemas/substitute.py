from pydantic import BaseModel, Field
from datetime import date as pydate
from typing import Optional, List

class SubstituteAssignRequest(BaseModel):
    date: pydate
    period_number: int = Field(..., ge=1)
    class_id: int
    original_teacher_id: int
    substitute_teacher_id: int

class AvailableTeacherResponse(BaseModel):
    id: int
    teacher_id: str
    name: str
    email: str
    max_lectures_per_day: int
    current_lectures_on_date: int

class SubstituteAssignmentResponse(BaseModel):
    id: int
    date: pydate
    period_number: int
    class_id: int
    class_name: Optional[str] = None
    division: Optional[str] = None
    original_teacher_id: int
    original_teacher_name: Optional[str] = None
    substitute_teacher_id: int
    substitute_teacher_name: Optional[str] = None
    status: str

    class Config:
        from_attributes = True
