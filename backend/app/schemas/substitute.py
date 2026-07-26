from pydantic import BaseModel, Field
from datetime import date as pydate
from typing import Optional, List


class SubstituteAssignRequest(BaseModel):
    date: pydate
    period_number: int = Field(..., ge=1)
    class_id: int
    subject_id: int
    original_teacher_id: int
    substitute_teacher_id: int


class SubstituteAssignBatchRequest(BaseModel):
    original_teacher_id: int
    date: pydate
    assignments: List[SubstituteAssignRequest]


class FutureSubstituteAssignRequest(BaseModel):
    class_id: int
    subject_id: int
    day_of_week: str
    period_number: int = Field(..., ge=1)
    substitute_teacher_id: int


class FutureSubstituteBatchRequest(BaseModel):
    original_teacher_id: int
    assignments: List[FutureSubstituteAssignRequest]


class AvailableTeacherResponse(BaseModel):
    id: int
    teacher_id: str
    name: str
    email: str
    max_lectures_per_day: int
    current_lectures_on_date: int
    has_subject_expertise: bool = False


class AffectedPeriodResponse(BaseModel):
    class_id: int
    class_name: str
    division: str
    subject_id: int
    subject_name: Optional[str] = None
    period_number: int
    day_of_week: Optional[str] = None


class SubstituteAssignmentResponse(BaseModel):
    id: int
    date: Optional[pydate] = None
    day_of_week: Optional[str] = None
    period_number: int
    class_id: int
    subject_id: Optional[int] = None
    class_name: Optional[str] = None
    division: Optional[str] = None
    subject_name: Optional[str] = None
    original_teacher_id: int
    original_teacher_name: Optional[str] = None
    substitute_teacher_id: int
    substitute_teacher_name: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class TeacherListResponse(BaseModel):
    id: int
    teacher_id: Optional[str] = None
    name: str
    email: str
    status: str

    class Config:
        from_attributes = True
