import logging
import asyncio
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.teacher import Teacher
from app.core.email import send_email_async
from app.config import settings

logger = logging.getLogger(__name__)


def send_notification_email(
    db: Session,
    user_id: int,
    message: str,
    notification_type: str,
    background_tasks: Optional[Any] = None
) -> bool:
    """
    Sends an email notification to a teacher.

    Storage optimization: the `notifications` table was dropped. In-app notifications are
    no longer persisted — alerts are delivered through the email channel (SMTP) which acts
    as the stateless push service, and the navbar bell shows data derived live from the
    substitute_assignments table.

    Returns True when the email was dispatched to a valid address, False otherwise.
    """
    user = db.get(Teacher, user_id)
    if not user or not user.email:
        return False

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

    # If Celery is enabled, queue it, else fallback to standard BackgroundTasks or direct execution
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
                asyncio.run(send_email_async(user.email, subject, body))
    else:
        if background_tasks:
            background_tasks.add_task(send_email_async, user.email, subject, body)
            logger.info(f"Queued email to {user.email} using FastAPI BackgroundTasks")
        else:
            asyncio.run(send_email_async(user.email, subject, body))
            logger.info(f"Sent email to {user.email} synchronously")

    return True
