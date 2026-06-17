from fastapi import Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.core.exceptions import CredentialsException, PermissionDeniedException
from app.core.security import decode_access_token
from app.models.teacher import Teacher

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> Teacher:
    """
    FastAPI dependency that extracts the JWT token from the HttpOnly 'access_token' cookie,
    decodes it, and retrieves the corresponding active user from the database.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise CredentialsException("Authentication cookie is missing or invalid.")
        
    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise CredentialsException("Token payload does not contain subject ID.")
        
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise CredentialsException("Invalid subject ID format.")
        
    stmt = select(Teacher).where(Teacher.id == user_id, Teacher.status == "ACTIVE")
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user:
        raise CredentialsException("User session is invalid or user is inactive.")
        
    return user

def require_role(required_role: str):
    """
    Enforces that the authenticated user possesses a specific role (e.g. 'ADMIN' or 'TEACHER').
    """
    def role_checker(current_user: Teacher = Depends(get_current_user)) -> Teacher:
        if current_user.role != required_role:
            raise PermissionDeniedException(f"Access denied. Require '{required_role}' privileges.")
        return current_user
    return role_checker

# Helper dependency shortcuts
require_admin = require_role("ADMIN")
require_teacher = require_role("TEACHER")
