from pydantic import BaseModel, Field
from typing import Optional

class SubjectCreate(BaseModel):
    subject_name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)

class SubjectUpdate(BaseModel):
    subject_name: Optional[str] = None
    code: Optional[str] = None

class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    code: str

    class Config:
        from_attributes = True
