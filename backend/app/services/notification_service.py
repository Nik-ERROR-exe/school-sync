import logging
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.models.teacher import Teacher
from app.core.email import send_email_async
from app.config import settings

logger = logging.getLogger(__name__)

async def create_notification(
    db: AsyncSession,
    user_id: int,
    message: str,
    notification_type: str,
    background_tasks: Optional[Any] = None
) -> Notification:
    """
    Creates an in-app notification in the database and triggers an email notification.
    Decides between Celery and FastAPI BackgroundTasks depending on the configuration.
    """
    # 1. Create DB notification record
    db_notification = Notification(
        user_id=user_id,
        message=message,
        type=notification_type,
        is_read=False
    )
    db.add(db_notification)
    await db.commit()
    await db.refresh(db_notification)
    
    # 2. Trigger Email notification
    user = await db.get(Teacher, user_id)
    if user and user.email:
        subject = f"SchoolSync Notification: {notification_type.replace('_', ' ').capitalize()}"
        body = f"""
        <html>
            <body>
                <h3>Hello {user.name},</h3>
                <p>{message}</p>
                <br/>
                <p>Best Regards,</p>
                <p><strong>SchoolSync Administrator</strong></p>
            </body>
        </html>
        """
        
        # If Celery is enabled, queue it, else fallback to standard BackgroundTasks or direct async execution
        if settings.USE_CELERY:
            try:
                from app.tasks.email_tasks import send_email_task
                send_email_task.delay(user.email, subject, body)
                logger.info(f"Queued email to {user.email} using Celery")
            except Exception as e:
                logger.error(f"Failed to queue celery task: {str(e)}. Falling back.")
                if background_tasks:
                    background_tasks.add_task(send_email_async, user.email, subject, body)
                else:
                    await send_email_async(user.email, subject, body)
        else:
            if background_tasks:
                background_tasks.add_task(send_email_async, user.email, subject, body)
                logger.info(f"Queued email to {user.email} using FastAPI BackgroundTasks")
            else:
                await send_email_async(user.email, subject, body)
                logger.info(f"Sent email to {user.email} synchronously")
                
    return db_notification
