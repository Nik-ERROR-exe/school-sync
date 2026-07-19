import json
from fastapi import APIRouter, Depends
from sqlalchemy.future import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.timetable_settings import TimetableSettings as TimetableSettingsModel

router = APIRouter(
    prefix="/timetable",
    tags=["Timetable - Shared"],
)

@router.get("/settings")
def get_timetable_settings_public(
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns saved timetable display settings (school days, period times, etc.).
    Accessible by any authenticated user (admin or teacher) since these are
    read-only display parameters needed to render the timetable grid.
    """
    existing = db.execute(select(TimetableSettingsModel)).scalar_one_or_none()
    if not existing:
        return {"success": False, "message": "No settings saved yet"}

    try:
        school_days_list = json.loads(existing.school_days)
    except Exception:
        school_days_list = []

    return {
        "school_days": school_days_list,
        "periods_per_day": existing.periods_per_day,
        "saturday_periods": existing.saturday_periods,
        "start_time": existing.start_time,
        "period_duration": existing.period_duration,
        "lunch_period": existing.lunch_period,
        "pt_subject_id": existing.pt_subject_id,
    }
