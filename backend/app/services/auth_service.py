from sqlalchemy.orm import Session
from app.models.teacher import Teacher
from app.core.security import verify_password
from typing import Optional, Tuple

def authenticate_user(db: Session, login_id: str, password: str) -> Tuple[Optional[Teacher], Optional[str]]:
    """
    Authenticate a user by matching their credentials against their stored record.
    Supports logging in with either an email address or teacher_id.
    """
    if "@" in login_id:
        teacher = db.query(Teacher).filter(Teacher.email == login_id).first()
    else:
        teacher = db.query(Teacher).filter(Teacher.teacher_id == login_id).first()
    
    if not teacher:
        return None, "Incorrect login ID or password."
        
    if not verify_password(password, teacher.password_hash):
        return None, "Incorrect login ID or password."
        
    if teacher.status == "PENDING":
        return None, "Registration pending admin approval."
        
    if teacher.status == "INACTIVE":
        return None, "Account deactivated."
        
    return teacher, None