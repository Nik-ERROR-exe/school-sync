import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import delete
from sqlalchemy.future import select
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.timetable import TimetableGenerateRequest, TimetableResponse, TimetableSaveRequest, TimetableSettingsSchema
from app.models.timetable_settings import TimetableSettings as TimetableSettingsModel
from app.services.timetable import (
    TimetableSolver,
    validate_timetable_slots
)
from app.services.timetable.factory import build_solver_input
from app.services.timetable.period_schedule import (
    PERIODS_PER_DAY,
    LUNCH_PERIOD,
    PERIOD_SCHEDULE,
)
from app.models.timetable import TimetableSlot
from app.models.teacher import Teacher
from app.core.date_utils import day_to_int, int_to_day
from app.core.exceptions import ValidationException
from app.services.timetable_report_service import (
    build_timetable_grids,
    generate_timetable_pdf,
    generate_timetable_excel,
)

router = APIRouter(
    prefix="/admin/timetable",
    tags=["Admin - Timetable Management"],
    dependencies=[Depends(require_admin)]
)


@router.post("/generate", response_model=TimetableResponse)
def generate_timetable(
    req: TimetableGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Triggers the constraint satisfaction problem solver to generate a valid, complete school timetable.
    """
    solver_input = build_solver_input(req, db)
    solver = TimetableSolver(solver_input)
    schedule = solver.solve()

    return {
        "schedule": schedule,
        "success": True,
        "message": "Timetable generated successfully."
    }


@router.put("/", response_model=TimetableResponse)
def save_timetable(
    req: TimetableSaveRequest,
    pt_subject_id: int = Query(..., description="ID representing Physical Training (PT)"),
    db: Session = Depends(get_db)
):
    # 1. Fetch all teachers for daily limit checks
    teachers_res = db.execute(select(Teacher))
    teachers_list = list(teachers_res.scalars().all())

    # 2. Run application-level validations BEFORE touching the database
    validate_timetable_slots(req.slots, teachers_list, pt_subject_id)

    # 3. Build the new slot objects
    new_slots = [
        TimetableSlot(
            class_id=s.class_id,
            day_of_week=day_to_int(s.day_of_week),
            period_number=s.period_number,
            subject_id=s.subject_id,
            teacher_id=s.teacher_id
        )
        for s in req.slots
        if s.subject_id > 0 and s.teacher_id > 0
    ]

    # Also save lunch period marker (subject_id=0) so each timetable remembers its own lunch
    for s in req.slots:
        if s.period_number == LUNCH_PERIOD and s.subject_id == 0:
            new_slots.append(
                TimetableSlot(
                    class_id=s.class_id,
                    day_of_week=day_to_int(s.day_of_week),
                    period_number=s.period_number,
                    subject_id=0,
                    teacher_id=0
                )
            )

    # 4. Atomic replace: delete old for these classes only → insert new
    class_ids = list(set(s.class_id for s in req.slots))
    try:
        db.execute(delete(TimetableSlot).where(TimetableSlot.class_id.in_(class_ids)))
        db.add_all(new_slots)
        db.flush()
        db.commit()
    except Exception as e:
        db.rollback()
        raise ValidationException(
            f"Failed to save timetable due to a database constraint violation: {str(e)}"
        )

    return {
        "schedule": req.slots,
        "success": True,
        "message": "Timetable saved successfully."
    }


@router.get("/", response_model=TimetableResponse)
def get_saved_timetable(db: Session = Depends(get_db)):
    slots = db.execute(select(TimetableSlot)).scalars().all()
    schedule = [
        {
            "class_id": s.class_id,
            "day_of_week": int_to_day(s.day_of_week),
            "period_number": s.period_number,
            "subject_id": s.subject_id,
            "teacher_id": s.teacher_id,
        }
        for s in slots
    ]
    return {"schedule": schedule, "success": True, "message": "Timetable loaded."}


@router.get("/export")
def export_timetable(
    format: str = Query("excel", description="Export format: 'pdf' or 'excel'"),
    class_id: Optional[int] = Query(None, description="Single class to export; omit for all classes"),
    school_name: str = Query("SchoolSync Academy", description="School name header shown on the exported file"),
    db: Session = Depends(get_db),
):
    """Download the saved master timetable as a PDF or Excel file."""
    stmt = (
        select(TimetableSlot)
        .options(
            joinedload(TimetableSlot.school_class),
            joinedload(TimetableSlot.subject),
            joinedload(TimetableSlot.teacher),
        )
        .order_by(TimetableSlot.class_id, TimetableSlot.day_of_week, TimetableSlot.period_number)
    )
    if class_id is not None:
        stmt = stmt.where(TimetableSlot.class_id == class_id)

    slots = db.execute(stmt).scalars().all()
    if not slots:
        raise ValidationException(
            "No saved timetable found. Generate and save a timetable before downloading."
        )

    settings = db.execute(select(TimetableSettingsModel)).scalar_one_or_none()
    grids = build_timetable_grids(slots, settings)

    fmt = format.lower()
    base_filename = f"timetable_class_{class_id}" if class_id is not None else "master_timetable"

    if fmt == "pdf":
        pdf_buffer = generate_timetable_pdf(grids, settings, school_name)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{base_filename}.pdf"'},
        )

    if fmt == "excel":
        excel_buffer = generate_timetable_excel(grids, settings, school_name)
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{base_filename}.xlsx"'},
        )

    raise ValidationException("Unsupported export format. Please choose 'pdf' or 'excel'.")


@router.post("/settings")
def save_timetable_settings(
    body: TimetableSettingsSchema,
    db: Session = Depends(get_db)
):
    existing = db.execute(select(TimetableSettingsModel)).scalar_one_or_none()
    if existing:
        existing.school_days = json.dumps(body.school_days)
        existing.saturday_periods = body.saturday_periods
        existing.pt_subject_id = body.pt_subject_id
    else:
        new_settings = TimetableSettingsModel(
            school_days=json.dumps(body.school_days),
            saturday_periods=body.saturday_periods,
            pt_subject_id=body.pt_subject_id,
        )
        db.add(new_settings)
    db.commit()
    return {"success": True, "message": "Settings saved."}


@router.get("/settings")
def get_timetable_settings(db: Session = Depends(get_db)):
    existing = db.execute(select(TimetableSettingsModel)).scalar_one_or_none()
    if not existing:
        return {"success": False, "message": "No settings saved yet"}

    try:
        school_days_list = json.loads(existing.school_days)
    except Exception:
        school_days_list = []

    return {
        "school_days": school_days_list,
        "periods_per_day": PERIODS_PER_DAY,
        "saturday_periods": existing.saturday_periods,
        "pt_subject_id": existing.pt_subject_id,
        "lunch_period": LUNCH_PERIOD,
        "periods": PERIOD_SCHEDULE,
    }
