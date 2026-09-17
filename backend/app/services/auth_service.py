from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.teacher import Teacher
from app.core.security import verify_password


async def authenticate_user(
    db: AsyncSession, login_id: str, password: str
) -> Tuple[Optional[Teacher], Optional[str]]:
    """Authenticate a user asynchronously by matching credentials against their stored record.
    Supports logging in with either an email address or teacher_id.
    """
    if "@" in login_id:
        stmt = select(Teacher).where(Teacher.email == login_id)
    else:
        stmt = select(Teacher).where(Teacher.teacher_id == login_id)

    result = await db.execute(stmt)
    teacher = result.scalar_one_or_none()

    if not teacher:
        return None, "Incorrect login ID or password."

    if not verify_password(password, teacher.password_hash):
        return None, "Incorrect login ID or password."

    if teacher.status == "PENDING":
        return None, "Registration pending admin approval."

    if teacher.status == "INACTIVE":
        return None, "Account deactivated."

    return teacher, None