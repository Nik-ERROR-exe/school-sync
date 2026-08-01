from pydantic import BaseModel, Field
from typing import Optional, List

# Marks range rule: entered marks must be between 35 and 100.
MIN_MARKS = 35
MAX_MARKS = 100

class MarkEntry(BaseModel):
    student_id: int
    marks_obtained: float = Field(ge=MIN_MARKS, le=MAX_MARKS)

class ResultSubmitRequest(BaseModel):
    class_id: int
    subject_id: int
    exam_type_id: int
    total_marks: float = Field(default=100.0, ge=MIN_MARKS, le=MAX_MARKS)
    marks: List[MarkEntry]

class TeacherMarkEntry(BaseModel):
    student_id: int
    subject_id: int
    marks_obtained: float = Field(ge=MIN_MARKS, le=MAX_MARKS)

class TeacherResultSubmit(BaseModel):
    class_id: int
    exam_type_id: int
    total_marks: float = Field(default=100.0, ge=MIN_MARKS, le=MAX_MARKS)
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
    student_roll_no: Optional[str] = None
    student_name: Optional[str] = None
    student_class: Optional[str] = None
    student_division: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    exam_type_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class ResultCreate(BaseModel):
    student_id: int
    subject_id: int
    exam_type_id: int
    marks_obtained: float = Field(ge=MIN_MARKS, le=MAX_MARKS)
    total_marks: float = Field(default=100.0, ge=MIN_MARKS, le=MAX_MARKS)
    percentage: Optional[float] = None
    grade: Optional[str] = None
    submitted_by_id: Optional[int] = None

class ResultBatchCreate(BaseModel):
    results: List[ResultCreate]

# --- Result Update Schemas ---
class ResultUpdate(BaseModel):
    marks_obtained: Optional[float] = Field(default=None, ge=MIN_MARKS, le=MAX_MARKS)
    total_marks: Optional[float] = Field(default=None, ge=MIN_MARKS, le=MAX_MARKS)
    status: Optional[str] = None

# --- Result Approval Schema ---
class ResultApproval(BaseModel):
    status: Optional[str] = None
    approved: Optional[bool] = None
