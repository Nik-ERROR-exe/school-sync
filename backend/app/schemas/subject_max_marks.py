from pydantic import BaseModel, Field
from typing import Optional, List

class SubjectMaxMarksBase(BaseModel):
    class_name: str
    subject_id: int
    exam_type_id: int
    max_marks: float = Field(gt=0)

class SubjectMaxMarksCreate(SubjectMaxMarksBase):
    pass

class SubjectMaxMarksUpdate(BaseModel):
    max_marks: float = Field(gt=0)

class SubjectMaxMarksResponse(SubjectMaxMarksBase):
    id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    exam_type_name: Optional[str] = None

    class Config:
        from_attributes = True

# New batch update schema
class SubjectMaxMarksBatchUpdateItem(BaseModel):
    id: int
    max_marks: float = Field(gt=0)

class SubjectMaxMarksBatchUpdate(BaseModel):
    updates: List[SubjectMaxMarksBatchUpdateItem]

class SubjectMaxMarksCopy(BaseModel):
    source_exam_type_id: int
    target_exam_type_id: int
    class_name: Optional[str] = None