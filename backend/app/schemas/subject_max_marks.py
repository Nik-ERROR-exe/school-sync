from pydantic import BaseModel, Field
from typing import Optional, List

class SubjectMaxMarksCreate(BaseModel):
    class_name: str
    subject_id: int
    exam_type_id: int
    akarikh_max: float
    oral_max: float
    written_max: float

class SubjectMaxMarksUpdate(BaseModel):
    akarikh_max: float
    oral_max: float
    written_max: float

class SubjectMaxMarksBatchUpdateItem(BaseModel):
    id: int
    akarikh_max: float
    oral_max: float
    written_max: float

class SubjectMaxMarksBatchUpdate(BaseModel):
    updates: List[SubjectMaxMarksBatchUpdateItem]

class SubjectMaxMarksCopy(BaseModel):
    source_exam_type_id: int
    target_exam_type_id: int
    class_name: Optional[str] = None

class SubjectMaxMarksResponse(BaseModel):
    id: int
    class_name: str
    subject_id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    exam_type_id: int
    exam_type_name: Optional[str] = None
    akarikh_max: float
    oral_max: float
    written_max: float
    max_marks: float

    class Config:
        from_attributes = True
