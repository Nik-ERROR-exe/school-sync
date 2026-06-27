from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.teacher import Teacher
from app.core.security import decode_token
from app.core.exceptions import CredentialsException, ForbiddenException

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Teacher:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise CredentialsException("Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise CredentialsException("Invalid token payload")
    
    user = db.query(Teacher).filter(Teacher.id == int(user_id)).first()
    
    if not user:
        raise CredentialsException("User not found")
    
    if user.status == "INACTIVE":
        raise ForbiddenException("Account is deactivated")
    
    return user

def require_admin(current_user: Teacher = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise ForbiddenException("Admin access required")
    return current_user

def require_active_teacher(current_user: Teacher = Depends(get_current_user)):
    if current_user.role != "TEACHER":
        raise ForbiddenException("Teacher access required")
    if current_user.status != "ACTIVE":
        raise ForbiddenException("Account is not active")
    return current_user