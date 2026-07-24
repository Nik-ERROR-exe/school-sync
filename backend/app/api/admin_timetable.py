import json
from datetime import datetime
from fastapi import APIRouter, Depends, Query
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
from app.models.timetable import TimetableSlot
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.weekly_requirement import WeeklyRequirement
from app.models.teacher_class_subject import TeacherClassSubject
from app.core.exceptions import ValidationException

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

    If `teachers`, `classes`, or `weekly_requirements` are omitted from the request body,
    the endpoint falls back to querying persisted data from the database. This allows
    the frontend to simply POST `{ "pt_subject_id": 5 }` and have the solver use all
    saved configuration.
    """

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
        # Load from DB with eager-loaded subject expertise
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
                subject_expertise=[s.id for s in t.subjects_expertise],
                max_lectures_per_day=t.max_lectures_per_day,
                availability=None   # availability column doesn't exist on Teacher model yet
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

    # Get the list of class IDs we are generating for (used for filtering requirements)
    generating_class_ids = [c.id for c in solver_classes]

    # --- Resolve Weekly Requirements ---
    # If the request provides requirements and the list is non‑empty, use them as minimums.
    # Otherwise, try to load from the WeeklyRequirement table.
    if req.weekly_requirements is not None and len(req.weekly_requirements) > 0:
        solver_reqs = [
            SolverRequirement(class_id=r.class_id, subject_id=r.subject_id, periods_per_week=r.periods_per_week)
            for r in req.weekly_requirements
        ]
    else:
        # First, try to fetch from the WeeklyRequirement table (existing)
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
                "Please configure weekly requirements in the timetable wizard (Step 3) "
                "before generating."
            )

    # Load existing slots for other classes (to preserve manually edited slots)
    existing_slots_db = db.execute(
        select(TimetableSlot).where(TimetableSlot.class_id.notin_(generating_class_ids))
    ).scalars().all()

    solver_existing_slots = [
        SolverSlot(
            class_id=s.class_id,
            day_of_week=s.day_of_week,
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

    solver_input = SolverInput(
        teachers=solver_teachers,
        classes=solver_classes,
        weekly_requirements=solver_reqs,
        school_days=req.school_days,
        periods_per_day=req.periods_per_day,
        lunch_period=req.lunch_period,
        pt_subject_id=req.pt_subject_id,
        existing_slots=solver_existing_slots,
        class_subject_teachers=class_subject_teachers
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
    """
    Validates a manually adjusted timetable and commits it to the database,
    replacing the current master schedule.

    This operation is ATOMIC: if validation passes but the DB insert fails
    (e.g. unique constraint violation), the old timetable is preserved via rollback.
    """
    # 1. Fetch all teachers for daily limit checks
    teachers_res = db.execute(select(Teacher))
    teachers_list = list(teachers_res.scalars().all())

    # 2. Run application-level validations BEFORE touching the database
    validate_timetable_slots(req.slots, teachers_list, pt_subject_id)

    # 3. Build the new slot objects (only non-free periods)
    new_slots = [
        TimetableSlot(
            class_id=s.class_id,
            day_of_week=s.day_of_week,
            period_number=s.period_number,
            subject_id=s.subject_id,
            teacher_id=s.teacher_id
        )
        for s in req.slots
        if s.subject_id > 0 and s.teacher_id > 0
    ]

    # 4. Atomic replace: delete old → insert new → flush to catch DB constraint errors
    #    If anything fails, the entire transaction rolls back and old data is preserved.
    try:
        db.execute(delete(TimetableSlot))
        db.add_all(new_slots)
        db.flush()  # Forces DB to check unique constraints NOW, before commit
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
            "day_of_week": s.day_of_week,
            "period_number": s.period_number,
            "subject_id": s.subject_id,
            "teacher_id": s.teacher_id,
        }
        for s in slots
    ]
    return {"schedule": schedule, "success": True, "message": "Timetable loaded."}

@router.post("/settings")
def save_timetable_settings(
    body: TimetableSettingsSchema,
    db: Session = Depends(get_db)
):
    existing = db.execute(select(TimetableSettingsModel)).scalar_one_or_none()
    if existing:
        existing.school_days = json.dumps(body.school_days)
        existing.periods_per_day = body.periods_per_day
        existing.saturday_periods = body.saturday_periods
        existing.start_time = body.start_time
        existing.period_duration = body.period_duration
        existing.lunch_period = body.lunch_period
        existing.pt_subject_id = body.pt_subject_id
        existing.updated_at = datetime.utcnow()
    else:
        new_settings = TimetableSettingsModel(
            school_days=json.dumps(body.school_days),
            periods_per_day=body.periods_per_day,
            saturday_periods=body.saturday_periods,
            start_time=body.start_time,
            period_duration=body.period_duration,
            lunch_period=body.lunch_period,
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
        "periods_per_day": existing.periods_per_day,
        "saturday_periods": existing.saturday_periods,
        "start_time": existing.start_time,
        "period_duration": existing.period_duration,
        "lunch_period": existing.lunch_period,
        "pt_subject_id": existing.pt_subject_id,
    }
