from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class LoginRequest(BaseModel):
    username: str = Field(..., description="Teacher ID or Email address")
    password: str = Field(..., min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CurrentUserResponse(BaseModel):
    id: int
    teacher_id: str
    name: str
    email: EmailStr
    role: str
    status: str

    class Config:
        from_attributes = True
        
class MessageResponse(BaseModel):
    message: str
