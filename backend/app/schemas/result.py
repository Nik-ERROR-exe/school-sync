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
    
    class Config:
        from_attributes = True

# --- NEW: Add these missing classes ---
class ResultCreate(BaseModel):
    student_id: int
    subject_id: int
    exam_type_id: int
    marks_obtained: float
    total_marks: float = 100.0
    percentage: float
    grade: str
    submitted_by_id: int

class ResultBatchCreate(BaseModel):
    class_id: int
    subject_id: int
    exam_type_id: int
    total_marks: float = 100.0
    marks: List[dict]  # [{student_id, marks_obtained}]

class ResultUpdate(BaseModel):
    marks_obtained: Optional[float] = None
    total_marks: Optional[float] = None
    status: Optional[str] = None

class ResultApproval(BaseModel):
    status: str  # 'approved' or 'rejected'