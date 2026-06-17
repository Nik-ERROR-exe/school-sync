from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, NotificationUpdate
from app.core.exceptions import ResourceNotFoundException

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False, description="If True, only fetches unread alerts"),
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves in-app notifications for the logged-in user.
    """
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
        
    stmt = stmt.order_by(Notification.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())

@router.put("/{id}", response_model=NotificationResponse)
async def update_notification_status(
    id: int,
    data: NotificationUpdate,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the is_read state of a notification.
    """
    stmt = select(Notification).where(
        Notification.id == id,
        Notification.user_id == current_user.id
    )
    res = await db.execute(stmt)
    notification = res.scalar_one_or_none()
    
    if not notification:
        raise ResourceNotFoundException("Notification", str(id))
        
    notification.is_read = data.is_read
    await db.commit()
    await db.refresh(notification)
    return notification
