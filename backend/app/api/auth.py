import os
from uuid import uuid4

from fastapi import APIRouter, Depends, status, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest, CurrentUserResponse, MessageResponse, TokenResponse, RegisterRequest
from app.services.auth_service import authenticate_user
from app.services.profile_service import build_me_response
from app.core.security import create_access_token, get_password_hash
from app.core.exceptions import CredentialsException, ConflictException
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024  # 2 MB


def _looks_like_image(content: bytes, content_type: str) -> bool:
    """Magic-byte sniff so a renamed non-image file can't slip through."""
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    return False

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
def get_me(
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the profile details of the currently authenticated user,
    including the profile photo, classes taught (teachers) or school
    stats (admins).
    """
    return build_me_response(db, current_user)


@router.post("/me/photo", response_model=CurrentUserResponse)
def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a profile photo for the authenticated user (JPG, PNG or WebP, max 2 MB).
    Returns the refreshed profile with the new profile_image_url.
    """
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image type. Use JPG, PNG or WebP.",
        )

    content = file.file.read()
    if len(content) > MAX_PROFILE_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile photo must be 2 MB or smaller.",
        )
    if not _looks_like_image(content, file.content_type):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File is not a valid image.",
        )

    profile_dir = os.path.join(settings.UPLOAD_DIR, "profiles")
    os.makedirs(profile_dir, exist_ok=True)
    filename = f"{uuid4().hex}{ext}"
    file_path = os.path.join(profile_dir, filename)

    with open(file_path, "wb") as fh:
        fh.write(content)

    # Best-effort removal of the previous photo.
    old_url = current_user.profile_image_url
    if old_url and old_url.startswith("/uploads/profiles/"):
        try:
            os.remove(os.path.join(profile_dir, os.path.basename(old_url)))
        except OSError:
            pass

    current_user.profile_image_url = f"/uploads/profiles/{filename}"
    try:
        db.commit()
        db.refresh(current_user)
    except Exception:
        db.rollback()
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise

    return build_me_response(db, current_user)

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