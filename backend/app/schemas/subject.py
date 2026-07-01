from pydantic import BaseModel
from typing import Optional

class SubjectCreate(BaseModel):
    subject_name: str
    code: str

class SubjectUpdate(BaseModel):
    subject_name: Optional[str] = None
    code: Optional[str] = None

class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    code: str

    class Config:
        from_attributes = True