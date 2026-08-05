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
    SolverInput,
    SolverTeacher,
    SolverClass,
    SolverRequirement,
    SolverSlot,
    TimetableSolver,
    validate_timetable_slots
)
from app.services.timetable.period_schedule import (
    PERIODS_PER_DAY,
    LUNCH_PERIOD,
    PERIOD_SCHEDULE,
)
from app.models.timetable import TimetableSlot
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.weekly_requirement import WeeklyRequirement
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.subject import Subject
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
    periods_per_day = PERIODS_PER_DAY
    lunch_period = LUNCH_PERIOD

    # --- Resolve Teachers ---
    if req.teachers is not None:
        solver_teachers = [
            SolverTeacher(
                id=t.id,
                name=t.name,
                subject_expertise=t.subject_expertise,
                max_lectures_per_day=t.max_lectures_per_day,
                availability=t.availability
            ) for t in req.teachers
        ]
    else:
        db_teachers = db.execute(
            select(Teacher)
            .options(joinedload(Teacher.subjects_expertise))
            .where(Teacher.status == "ACTIVE")
        ).scalars().unique().all()

        if not db_teachers:
            raise ValidationException("No active teachers found in the database. Create teachers first.")

        solver_teachers = [
            SolverTeacher(
                id=t.id,
                name=t.name,
                subject_expertise=list(dict.fromkeys(s.id for s in t.subjects_expertise)),
                max_lectures_per_day=t.max_lectures_per_day,
                availability=None
            )
            for t in db_teachers
        ]

    # --- Resolve Classes ---
    if req.classes is not None:
        solver_classes = [
            SolverClass(id=c.id, class_name=c.class_name, division=c.division)
            for c in req.classes
        ]
    else:
        stmt = select(SchoolClass)
        result = db.execute(stmt)
        db_classes = list(result.scalars().all())

        if not db_classes:
            raise ValidationException("No classes found in the database. Create classes first.")

        solver_classes = [
            SolverClass(id=c.id, class_name=c.class_name, division=c.division)
            for c in db_classes
        ]

    generating_class_ids = [c.id for c in solver_classes]

    # --- Resolve Weekly Requirements ---
    if req.weekly_requirements is not None and len(req.weekly_requirements) > 0:
        solver_reqs = [
            SolverRequirement(class_id=r.class_id, subject_id=r.subject_id, periods_per_week=r.periods_per_week)
            for r in req.weekly_requirements
        ]
    else:
        stmt = select(WeeklyRequirement).where(WeeklyRequirement.class_id.in_(generating_class_ids))
        result = db.execute(stmt)
        db_reqs = result.scalars().all()

        if db_reqs:
            solver_reqs = [
                SolverRequirement(class_id=r.class_id, subject_id=r.subject_id, periods_per_week=r.periods_per_week)
                for r in db_reqs
            ]
        else:
            raise ValidationException(
                f"No weekly requirements found for classes {generating_class_ids}. "
                "Please configure weekly requirements before generating."
            )

    # Load existing slots for other classes (to preserve manually edited slots & prevent teacher clashes)
    existing_slots_db = db.execute(
        select(TimetableSlot).where(TimetableSlot.class_id.notin_(generating_class_ids))
    ).scalars().all()

    solver_existing_slots = [
        SolverSlot(
            class_id=s.class_id,
            day_of_week=int_to_day(s.day_of_week),
            period_number=s.period_number,
            subject_id=s.subject_id,
            teacher_id=s.teacher_id
        )
        for s in existing_slots_db
    ]

    # Load 3-way teacher-class-subject mappings from DB
    tcs_rows = db.execute(select(TeacherClassSubject)).scalars().all()
    class_subject_teachers = {}
    for row in tcs_rows:
        key = (row.class_id, row.subject_id)
        if key not in class_subject_teachers:
            class_subject_teachers[key] = []
        class_subject_teachers[key].append(row.teacher_id)

    # Apply admin teacher overrides (issue #5: popup selection for multi-teacher subjects)
    if req.subject_teacher_assignments:
        for key_str, teacher_id in req.subject_teacher_assignments.items():
            # Keys come as "class_id_subject_id" strings from JSON
            parts = key_str.split('_')
            if len(parts) == 2:
                class_id = int(parts[0])
                subject_id = int(parts[1])
                key = (class_id, subject_id)
                if key in class_subject_teachers:
                    class_subject_teachers[key] = [
                        t for t in class_subject_teachers[key] if t == teacher_id
                    ]
                else:
                    class_subject_teachers[key] = [teacher_id]

    # Subject display names for human-readable diagnostics
    subject_names = {
        s.id: s.subject_name
        for s in db.execute(select(Subject)).scalars().all()
    }

    solver_input = SolverInput(
        teachers=solver_teachers,
        classes=solver_classes,
        weekly_requirements=solver_reqs,
        school_days=req.school_days,
        periods_per_day=periods_per_day,
        lunch_period=lunch_period,
        pt_subject_id=req.pt_subject_id,
        existing_slots=solver_existing_slots,
        class_subject_teachers=class_subject_teachers,
        subject_names=subject_names
    )

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
