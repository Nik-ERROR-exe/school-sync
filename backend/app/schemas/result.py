from pydantic import BaseModel, Field
from typing import Optional, List

class ResultBase(BaseModel):
    student_id: int
    subject_id: int
    exam_type_id: int
    marks_obtained: float = Field(..., ge=0)
    total_marks: float = Field(default=100.0, gt=0)

class ResultCreate(ResultBase):
    pass

class ResultBatchCreate(BaseModel):
    results: List[ResultCreate]

class ResultUpdate(BaseModel):
    marks_obtained: Optional[float] = Field(None, ge=0)
    total_marks: Optional[float] = Field(None, gt=0)

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
        
class ResultApproval(BaseModel):
    approved: bool
