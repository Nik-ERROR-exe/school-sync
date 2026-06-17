import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

async def send_email_async(to_email: str, subject: str, body: str) -> None:
    """
    Sends an email using standard SMTP.
    If no SMTP host is configured, it falls back to console logging.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.info("SMTP Credentials not configured. Printing email to stdout:")
        logger.info(f"\n--- [EMAIL MOCK] ---\nTo: {to_email}\nSubject: {subject}\nBody: {body}\n--------------------")
        return

    message = MIMEMultipart()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "html"))

    try:
        kwargs = {
            "hostname": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "username": settings.SMTP_USERNAME,
            "password": settings.SMTP_PASSWORD,
        }
        
        # Configure security parameters based on standard port standards
        if settings.SMTP_PORT == 465:
            kwargs["use_tls"] = True
        elif settings.SMTP_PORT == 587:
            kwargs["start_tls"] = True
            
        await aiosmtplib.send(message, **kwargs)
        logger.info(f"Email successfully sent to {to_email}")
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {str(e)}")
        # Raise exception so background task runners know it failed
        raise e
