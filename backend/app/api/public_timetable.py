from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.future import select
import json
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.timetable_settings import TimetableSettings
from app.core.date_utils import format_time

router = APIRouter(
    prefix="/timetable",
    tags=["Timetable - Public Info"],
)

@router.get("/settings")
def get_timetable_settings_public(
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the current timetable settings.
    Accessible by both admins and teachers (any logged-in user).
    Used by teachers to render their personal timetable grid correctly.
    """
    settings = db.execute(select(TimetableSettings)).scalar_one_or_none()
    if not settings:
        return {
            "success": False,
            "message": "No timetable settings saved yet.",
            "data": None
        }

    school_days_list = json.loads(settings.school_days) if isinstance(settings.school_days, str) else settings.school_days

    return {
        "success": True,
        "school_days": school_days_list,
        "periods_per_day": settings.periods_per_day,
        "saturday_periods": settings.saturday_periods,
        "start_time": format_time(settings.start_time),
        "period_duration": settings.period_duration,
        "lunch_period": settings.lunch_period,
        "pt_subject_id": settings.pt_subject_id,
        "data": {
            "school_days": school_days_list,
            "periods_per_day": settings.periods_per_day,
            "saturday_periods": settings.saturday_periods,
            "start_time": format_time(settings.start_time),
            "period_duration": settings.period_duration,
            "lunch_period": settings.lunch_period,
            "pt_subject_id": settings.pt_subject_id,
        }
    }
