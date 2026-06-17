import asyncio
from app.tasks.celery_app import celery_app
from app.core.email import send_email_async

@celery_app.task(name="app.tasks.email_tasks.send_email_task")
def send_email_task(to_email: str, subject: str, body: str) -> None:
    """
    Celery task that sends emails asynchronously using the async send_email_async utility
    executed within a standard sync Celery execution context using asyncio.run.
    """
    asyncio.run(send_email_async(to_email, subject, body))
