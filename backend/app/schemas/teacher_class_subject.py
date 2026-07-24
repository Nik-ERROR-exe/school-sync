from pydantic import BaseModel
from typing import List, Optional

class TeacherClassSubjectAssignment(BaseModel):
    class_id: int
    subject_id: int

class TeacherClassSubjectBatchCreate(BaseModel):
    assignments: List[TeacherClassSubjectAssignment]

class TeacherClassSubjectResponse(BaseModel):
    id: int
    teacher_id: int
    class_id: int
    subject_id: int
    class_name: Optional[str] = None
    division: Optional[str] = None
    subject_name: Optional[str] = None
    code: Optional[str] = None

    class Config:
        from_attributes = True