from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TeacherClassSubjectBase(BaseModel):
    teacher_id: int = Field(..., description="Teacher ID")
    class_id: int = Field(..., description="Class ID")
    subject_id: int = Field(..., description="Subject ID")

class TeacherClassSubjectCreate(TeacherClassSubjectBase):
    pass

class TeacherClassSubjectResponse(TeacherClassSubjectBase):
    id: int
    created_at: Optional[datetime] = None
    teacher_name: Optional[str] = None
    class_name: Optional[str] = None
    division: Optional[str] = None
    subject_name: Optional[str] = None

    class Config:
        from_attributes = True

class TeacherClassSubjectListResponse(BaseModel):
    assignments: list[TeacherClassSubjectResponse]
    total: int

class TeacherClassesResponse(BaseModel):
    class_id: int
    class_name: str
    division: str
    subject_id: int
    subject_name: str