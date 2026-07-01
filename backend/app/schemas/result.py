from pydantic import BaseModel
from typing import Optional, List

# --- Existing classes ---
class MarkEntry(BaseModel):
    student_id: int
    marks_obtained: float

class ResultSubmitRequest(BaseModel):
    class_id: int
    subject_id: int
    exam_type_id: int
    total_marks: float = 100.0
    marks: List[MarkEntry]

class ResultResponse(BaseModel):
    id: int
    student_id: int
    subject_id: int
    exam_type_id: int
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

# --- Result Creation Schemas ---
class ResultCreate(BaseModel):
    student_id: int
    subject_id: int
    exam_type_id: int
    marks_obtained: float
    total_marks: float = 100.0

class ResultBatchCreate(BaseModel):
    class_id: int
    exam_type_id: int
    total_marks: float = 100.0
    results: List[ResultCreate]

# --- Result Update Schemas ---
class ResultUpdate(BaseModel):
    marks_obtained: Optional[float] = None
    total_marks: Optional[float] = None
    status: Optional[str] = None

# --- Result Approval Schema ---
class ResultApproval(BaseModel):
    approved: bool = True  # True = approve, False = reject