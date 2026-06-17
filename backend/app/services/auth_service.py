from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.teacher import Teacher
from app.core.security import verify_password
from typing import Optional

async def authenticate_user(db: AsyncSession, login_id: str, password: str) -> Optional[Teacher]:
    """
    Authenticate a user by matching their credentials against their stored record.
    Supports logging in with either an email address or teacher_id.
    """
    # Check if login_id contains an '@' to treat it as email, else treat it as teacher_id
    if "@" in login_id:
        stmt = select(Teacher).where(Teacher.email == login_id, Teacher.status == "ACTIVE")
    else:
        stmt = select(Teacher).where(Teacher.teacher_id == login_id, Teacher.status == "ACTIVE")
        
    result = await db.execute(stmt)
    teacher = result.scalar_one_or_none()
    
    if not teacher:
        return None
        
    if not verify_password(password, teacher.password_hash):
        return None
        
    return teacher
