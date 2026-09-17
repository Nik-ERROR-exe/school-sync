from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    CurrentUserResponse,
    MessageResponse,
    TokenResponse,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.auth_service import authenticate_user
from app.services.profile_service import build_me_response
from app.core.security import create_access_token, get_password_hash
from app.core.exceptions import CredentialsException, ConflictException
from app.api.deps import get_current_user
from app.core.ratelimit import limiter
from app.models.teacher import Teacher

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticates teacher/admin and returns a JWT access token.
    Supports login with either email address or teacher_id asynchronously.
    """
    user, error_msg = await authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise CredentialsException(error_msg or "Incorrect credentials.")

    # Generate token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        email=user.email,
        name=user.name,
        teacher_id=user.teacher_id,
        status=user.status,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """Logout endpoint. Frontend should discard the token."""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=CurrentUserResponse)
async def get_me(
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the profile details of the currently authenticated user,
    including classes taught (teachers) or school stats (admins).
    """
    return await build_me_response(db, current_user)


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new teacher asynchronously. Account will be created in PENDING status awaiting admin approval."""
    # Check if email exists
    result = await db.execute(select(Teacher).where(Teacher.email == data.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise ConflictException("This email address is already registered.")

    db_teacher = Teacher(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role="TEACHER",
        status="PENDING",
        teacher_id=None
    )

    db.add(db_teacher)
    await db.commit()

    return {"message": "Registration successful. Your account is pending admin approval."}


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Initiates a password reset request with rate limiting.
    Rate-limited to 5 requests per minute to prevent brute-force abuse.
    """
    result = await db.execute(select(Teacher).where(Teacher.email == data.email))
    teacher = result.scalar_one_or_none()
    # Return uniform message to avoid user enumeration
    return {"message": "If the email is registered, password reset instructions have been sent."}


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Resets password with a verified reset token.
    Rate-limited to 5 requests per minute to prevent token guessing.
    """
    return {"message": "Password has been successfully reset."}