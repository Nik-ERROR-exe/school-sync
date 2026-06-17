from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import LoginRequest, CurrentUserResponse, MessageResponse
from app.services.auth_service import authenticate_user
from app.core.security import create_access_token
from app.core.exceptions import CredentialsException
from app.api.deps import get_current_user
from app.models.teacher import Teacher

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
async def login(
    response: Response,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates teacher/admin and issues JWT inside an HttpOnly, Secure cookie.
    """
    user = await authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise CredentialsException("Incorrect login ID (email/teacher_id) or password.")
        
    # Generate token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    # Write to cookie (HttpOnly, Secure, Lax)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # Mandatory for security
        samesite="lax",
        max_age=1440 * 60,  # 24 hours in seconds
    )
    
    return {"message": "Authenticated successfully"}

@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    """
    Clears the authentication HttpOnly cookie.
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=CurrentUserResponse)
async def get_me(current_user: Teacher = Depends(get_current_user)):
    """
    Returns the profile details of the currently authenticated active user.
    """
    return current_user
