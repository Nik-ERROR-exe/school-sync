from pydantic import BaseModel
from typing import List

class TeacherClassCreate(BaseModel):
    class_ids: List[int]

class TeacherClassResponse(BaseModel):
    id: int
    teacher_id: int
    class_id: int

    class Config:
        from_attributes = True