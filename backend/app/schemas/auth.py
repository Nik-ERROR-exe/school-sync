from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

class LoginRequest(BaseModel):
    email: str = Field(..., description="Email address or Teacher ID")
    password: str = Field(..., min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: str
    name: str
    teacher_id: Optional[str] = None
    status: str

class SubjectRef(BaseModel):
    subject_name: str
    code: str


class ClassTeachingInfo(BaseModel):
    class_name: str
    division: str
    subjects: List[SubjectRef]


class SchoolStats(BaseModel):
    teachers_count: int
    classes_count: int
    students_count: int


class CurrentUserResponse(BaseModel):
    id: int
    teacher_id: Optional[str] = None
    name: str
    email: EmailStr
    role: str
    status: str
    classes_teaching: Optional[List[ClassTeachingInfo]] = None
    stats: Optional[SchoolStats] = None

    class Config:
        from_attributes = True
        
class MessageResponse(BaseModel):
    message: str

class RegisterRequest(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
