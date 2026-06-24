from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest, CurrentUserResponse, MessageResponse, TokenResponse, RegisterRequest
from app.services.auth_service import authenticate_user
from app.core.security import create_access_token, get_password_hash
from app.core.exceptions import CredentialsException, ConflictException
from app.api.deps import get_current_user
from app.models.teacher import Teacher

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticates teacher/admin and returns a JWT access token.
    Supports login with either email address or teacher_id.
    """
    user, error_msg = authenticate_user(db, login_data.email, login_data.password)
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
def logout():
    """
    Logout endpoint. Frontend should discard the token.
    """
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=CurrentUserResponse)
def get_me(current_user: Teacher = Depends(get_current_user)):
    """
    Returns the profile details of the currently authenticated user.
    """
    return current_user

@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new teacher. Account will be created in PENDING status awaiting admin approval.
    """
    # Check if email exists
    existing = db.query(Teacher).filter(Teacher.email == data.email).first()
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
    db.commit()
    
    return {"message": "Registration successful. Your account is pending admin approval."}