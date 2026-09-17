from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.teacher import Teacher
from app.core.security import decode_token
from app.core.exceptions import CredentialsException, ForbiddenException

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Teacher:
    """Async dependency to retrieve and authenticate the current user from the JWT token.
    Uses AsyncSession and await db.execute() with SQLAlchemy 2.0 select.
    """
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise CredentialsException("Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise CredentialsException("Invalid token payload")

    result = await db.execute(select(Teacher).where(Teacher.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise CredentialsException("User not found")

    if user.status == "INACTIVE":
        raise ForbiddenException("Account is deactivated")

    return user


async def require_admin(current_user: Teacher = Depends(get_current_user)) -> Teacher:
    """Async authorization dependency ensuring the current user has the ADMIN role."""
    if current_user.role != "ADMIN":
        raise ForbiddenException("Admin access required")
    return current_user


async def require_active_teacher(current_user: Teacher = Depends(get_current_user)) -> Teacher:
    """Async authorization dependency ensuring the current user is an active TEACHER."""
    if current_user.role != "TEACHER":
        raise ForbiddenException("Teacher access required")
    if current_user.status != "ACTIVE":
        raise ForbiddenException("Account is not active")
    return current_user