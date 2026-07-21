from pydantic import BaseModel, Field
from typing import Optional, List
from app.schemas.subject import SubjectResponse

class SchoolClassCreate(BaseModel):
    class_name: str = Field(..., max_length=50)
    division: str = Field(..., max_length=50)

class SchoolClassUpdate(BaseModel):
    class_name: Optional[str] = Field(None, max_length=50)
    division: Optional[str] = Field(None, max_length=50)
    class_teacher_id: Optional[int] = None

class SchoolClassResponse(BaseModel):
    id: int
    class_name: str
    division: str
    class_teacher_id: Optional[int]
    subjects: List[SubjectResponse] = []

    class Config:
        from_attributes = True

class ClassSubjectsUpdate(BaseModel):
    subject_ids: List[int]
