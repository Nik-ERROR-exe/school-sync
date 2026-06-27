from pydantic import BaseModel, EmailStr, Field
from typing import Optional

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

class CurrentUserResponse(BaseModel):
    id: int
    teacher_id: Optional[str] = None
    name: str
    email: EmailStr
    role: str
    status: str

    class Config:
        from_attributes = True
        
class MessageResponse(BaseModel):
    message: str

class RegisterRequest(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
