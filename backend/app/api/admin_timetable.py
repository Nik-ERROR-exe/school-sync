import asyncio
import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import delete
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.timetable import (
    TimetableGenerateRequest,
    TimetableResponse,
    TimetableSaveRequest,
    TimetableSettingsSchema,
    SlotCalculationRequest,
    SlotCalculationResponse,
)
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
from app.models.school_class import SchoolClass
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


def _to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _to_24h(total_minutes: int) -> str:
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"


def _to_12h(hhmm: str) -> str:
    h, m = hhmm.split(":")
    h12 = int(h) % 12
    if h12 == 0:
        h12 = 12
    return f"{h12}:{int(m):02d}"


@router.post("/generate", response_model=TimetableResponse)
async def generate_timetable(
    req: TimetableGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Triggers CSP solver to generate a timetable asynchronously (solver CPU offloaded to thread)."""
    solver_input = await build_solver_input(req, db)
    solver = TimetableSolver(solver_input)
    schedule = await asyncio.to_thread(solver.solve)

    relaxations = []
    for t_id, d in solver_input.soft_violation_teachers.items():
        t = next((x for x in solver_input.teachers if x.id == t_id), None)
        relaxations.append({
            "teacher_id": t_id,
            "teacher_name": t.name if t else f"Teacher #{t_id}",
            "demand": d,
            "reason": "soft_cap_relaxed",
        })
    for t_id, d in solver_input.physical_overflow_teachers.items():
        t = next((x for x in solver_input.teachers if x.id == t_id), None)
        relaxations.append({
            "teacher_id": t_id,
            "teacher_name": t.name if t else f"Teacher #{t_id}",
            "demand": d,
            "reason": "physical_overflow_gaps_allowed",
        })

    return {
        "schedule": schedule,
        "success": True,
        "message": "Timetable generated successfully.",
        "relaxations": relaxations,
    }


@router.post("/calculate-slots", response_model=SlotCalculationResponse)
async def calculate_slots(req: SlotCalculationRequest):
    """Given start time, end time, period length, and lunch length,
    return the slot list. Stateless. Labels use 12-hour format without
    am/pm suffix. When lunch_minutes > 0 the total positions =
    teaching_slots + 1 (one position reserved for lunch); the caller
    shifts post-lunch labels by (lunch_minutes - period_minutes) after
    selecting a lunch position."""
    try:
        start = _to_minutes(req.start_time)
        end = _to_minutes(req.end_time)
    except (ValueError, AttributeError):
        raise ValidationException("Invalid time format. Use HH:MM.")

    if end <= start:
        raise ValidationException("End time must be after start time.")
    if req.period_minutes <= 0:
        raise ValidationException("Period length must be positive.")
    if req.lunch_minutes < 0:
        raise ValidationException("Lunch length cannot be negative.")

    total = end - start
    if req.lunch_minutes > 0:
        if req.lunch_minutes >= total:
            raise ValidationException(
                "Lunch length cannot be as long as the school day."
            )
        teaching_minutes = total - req.lunch_minutes
    else:
        teaching_minutes = total

    teaching_slots = teaching_minutes // req.period_minutes
    if teaching_slots == 0:
        raise ValidationException(
            "No period fits in the given time range. Shorten the period "
            "or extend the day."
        )
    periods_per_day = teaching_slots + (1 if req.lunch_minutes > 0 else 0)

    # Default lunch position: 4 if there are at least 4 teaching slots
    # before it fits, otherwise the midpoint.
    if req.lunch_minutes > 0:
        default_lunch = min(4, periods_per_day)
    else:
        default_lunch = 0

    slots = []
    for i in range(1, periods_per_day + 1):
        if req.lunch_minutes > 0 and i == default_lunch:
            s = start + (i - 1) * req.period_minutes
            e = s + req.lunch_minutes
            kind = "lunch"
        elif req.lunch_minutes > 0 and i > default_lunch:
            s = start + (i - 2) * req.period_minutes + req.lunch_minutes
            e = s + req.period_minutes
            kind = "period"
        else:
            s = start + (i - 1) * req.period_minutes
            e = s + req.period_minutes
            kind = "period"
        s_str = _to_24h(s)
        e_str = _to_24h(e)
        slots.append({
            "index": i,
            "start": s_str,
            "end": e_str,
            "label": f"{_to_12h(s_str)} – {_to_12h(e_str)}",
        })

    # actual_end: end of the last position
    last = slots[-1]
    actual_end = last["end"]
    # leftover = total minutes not covered by any position
    used_minutes = 0
    for slot in slots:
        used_minutes += _to_minutes(slot["end"]) - _to_minutes(slot["start"])
    leftover = total - used_minutes

    return {
        "periods_per_day": periods_per_day,
        "slots": slots,
        "actual_end": actual_end,
        "leftover_minutes": max(0, leftover),
    }


@router.put("/", response_model=TimetableResponse)
async def save_timetable(
    req: TimetableSaveRequest,
    pt_subject_id: int = Query(..., description="ID representing Physical Training (PT)"),
    db: AsyncSession = Depends(get_db)
):
    """Save generated timetable slots to database asynchronously."""
    # 1. Fetch all teachers for daily limit checks
    teachers_res = await db.execute(select(Teacher))
    teachers_list = list(teachers_res.scalars().all())

    # 2. Run application-level validations BEFORE touching the database
    # 2b. Load class_teacher_id for every class referenced in the save
    class_ids_in_save = list({s.class_id for s in req.slots})
    ct_res = await db.execute(
        select(SchoolClass.id, SchoolClass.class_teacher_id).where(
            SchoolClass.id.in_(class_ids_in_save)
        )
    )
    class_teacher_map: dict[int, int] = {
        row.id: row.class_teacher_id
        for row in ct_res.all()
        if row.class_teacher_id is not None
    }
    settings_res = await db.execute(select(TimetableSettingsModel))
    settings_row = settings_res.scalar_one_or_none()
    saved_lunch_period = (
        settings_row.lunch_period
        if settings_row and settings_row.lunch_period is not None
        else LUNCH_PERIOD
    )
    validate_timetable_slots(req.slots, teachers_list, pt_subject_id,
                             class_teacher_map)

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

    # Also write a lunch-period marker row (subject_id=0) for each class the
    # request touches, positioned at the configured lunch slot.
    if saved_lunch_period and saved_lunch_period > 0:
        touched_classes = {s.class_id for s in req.slots}
        touched_days = {s.day_of_week for s in req.slots}
        for cid in touched_classes:
            for day_str in touched_days:
                new_slots.append(
                    TimetableSlot(
                        class_id=cid,
                        day_of_week=day_to_int(day_str),
                        period_number=saved_lunch_period,
                        subject_id=0,
                        teacher_id=0,
                    )
                )

    # 4. Atomic replace: delete old for these classes only -> insert new
    class_ids = list(set(s.class_id for s in req.slots))
    try:
        await db.execute(delete(TimetableSlot).where(TimetableSlot.class_id.in_(class_ids)))
        db.add_all(new_slots)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise ValidationException(
            f"Failed to save timetable due to a database constraint violation: {str(e)}"
        )

    return {
        "schedule": req.slots,
        "success": True,
        "message": "Timetable saved successfully."
    }


@router.get("/", response_model=TimetableResponse)
async def get_saved_timetable(db: AsyncSession = Depends(get_db)):
    """Retrieve saved master timetable asynchronously."""
    res = await db.execute(select(TimetableSlot))
    slots = res.scalars().all()
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
async def export_timetable(
    format: str = Query("excel", description="Export format: 'pdf' or 'excel'"),
    class_id: Optional[int] = Query(None, description="Single class to export; omit for all classes"),
    school_name: str = Query("SchoolSync Academy", description="School name header shown on the exported file"),
    db: AsyncSession = Depends(get_db),
):
    """Download the saved master timetable as a PDF or Excel file asynchronously."""
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

    res = await db.execute(stmt)
    slots = res.scalars().all()
    if not slots:
        raise ValidationException(
            "No saved timetable found. Generate and save a timetable before downloading."
        )

    settings_res = await db.execute(select(TimetableSettingsModel))
    settings = settings_res.scalar_one_or_none()
    grids = build_timetable_grids(slots, settings)

    fmt = format.lower()
    base_filename = f"timetable_class_{class_id}" if class_id is not None else "master_timetable"

    if fmt == "pdf":
        pdf_buffer = await asyncio.to_thread(generate_timetable_pdf, grids, settings, school_name)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{base_filename}.pdf"'},
        )

    if fmt == "excel":
        excel_buffer = await asyncio.to_thread(generate_timetable_excel, grids, settings, school_name)
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{base_filename}.xlsx"'},
        )

    raise ValidationException("Unsupported export format. Please choose 'pdf' or 'excel'.")


@router.post("/settings")
async def save_timetable_settings(
    body: TimetableSettingsSchema,
    db: AsyncSession = Depends(get_db)
):
    """Save timetable display settings asynchronously."""
    res = await db.execute(select(TimetableSettingsModel))
    existing = res.scalar_one_or_none()
    if existing:
        existing.school_days = json.dumps(body.school_days)
        existing.saturday_periods = body.saturday_periods
        existing.pt_subject_id = body.pt_subject_id
        # Only overwrite display-config fields when the client sends them.
        # A None here means "leave as-is", not "clear".
        if body.periods_per_day is not None:
            existing.periods_per_day = body.periods_per_day
        if body.lunch_period is not None:
            existing.lunch_period = body.lunch_period
        if body.start_time is not None:
            existing.start_time = body.start_time
        if body.period_minutes is not None:
            existing.period_duration = body.period_minutes  # API field name differs from DB column name
        if body.lunch_minutes is not None:
            existing.lunch_duration = body.lunch_minutes
    else:
        new_settings = TimetableSettingsModel(
            school_days=json.dumps(body.school_days),
            saturday_periods=body.saturday_periods,
            pt_subject_id=body.pt_subject_id,
            periods_per_day=body.periods_per_day,
            lunch_period=body.lunch_period,
            start_time=body.start_time,
            period_duration=body.period_minutes,
            lunch_duration=body.lunch_minutes,
        )
        db.add(new_settings)
    await db.commit()
    return {"success": True, "message": "Settings saved."}


@router.get("/settings")
async def get_timetable_settings(db: AsyncSession = Depends(get_db)):
    """Retrieve saved timetable display settings asynchronously."""
    res = await db.execute(select(TimetableSettingsModel))
    existing = res.scalar_one_or_none()
    if not existing:
        return {"success": False, "message": "No settings saved yet"}

    try:
        school_days_list = json.loads(existing.school_days)
    except Exception:
        school_days_list = []

    return {
        "school_days": school_days_list,
        "periods_per_day": (
            existing.periods_per_day
            if existing.periods_per_day is not None
            else PERIODS_PER_DAY
        ),
        "saturday_periods": existing.saturday_periods,
        "pt_subject_id": existing.pt_subject_id,
        "lunch_period": (
            existing.lunch_period
            if existing.lunch_period is not None
            else LUNCH_PERIOD
        ),
        "start_time": existing.start_time,
        "period_minutes": existing.period_duration,
        "lunch_minutes": existing.lunch_duration,
        "periods": PERIOD_SCHEDULE,
    }
