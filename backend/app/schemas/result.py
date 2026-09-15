from pydantic import BaseModel, Field
from typing import Optional, List

# Marks range rule: entered marks must be between 0 and the subject's configured max_marks.
MIN_MARKS = 0
MAX_MARKS = 1000

class MarkEntry(BaseModel):
    student_id: int
    marks_obtained: float = Field(ge=MIN_MARKS)

class ResultSubmitRequest(BaseModel):
    class_id: int
    subject_id: int
    exam_type_id: int
    marks: List[MarkEntry]

class TeacherMarkEntry(BaseModel):
    student_id: int
    subject_id: int
    marks_obtained: float = Field(ge=MIN_MARKS)

class TeacherResultSubmit(BaseModel):
    class_id: int
    exam_type_id: int
    marks: List[TeacherMarkEntry]

class ResultResponse(BaseModel):
    id: int
    student_id: int
    student_roll_no: Optional[str] = None
    student_name: Optional[str] = None
    student_class: Optional[str] = None
    student_division: Optional[str] = None
    
    subject_id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    
    exam_type_id: int
    exam_type_name: Optional[str] = None
    
    marks_obtained: float
    total_marks: float
    percentage: float
    grade: str
    status: str
    submitted_by_id: int
    approved_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class ResultCreate(BaseModel):
    student_id: int
    subject_id: int
    exam_type_id: int
    marks_obtained: float = Field(ge=MIN_MARKS)
    percentage: Optional[float] = None
    grade: Optional[str] = None
    submitted_by_id: Optional[int] = None

class ResultBatchCreate(BaseModel):
    results: List[ResultCreate]

# --- Result Update Schemas ---
class ResultUpdate(BaseModel):
    marks_obtained: Optional[float] = Field(default=None, ge=MIN_MARKS)
    status: Optional[str] = None

# --- Result Approval Schema ---
class ResultApproval(BaseModel):
    status: Optional[str] = None
    approved: Optional[bool] = None


