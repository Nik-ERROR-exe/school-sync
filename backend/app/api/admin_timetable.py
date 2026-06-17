from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.timetable import TimetableGenerateRequest, TimetableResponse, TimetableSaveRequest
from app.services.timetable import (
    SolverInput,
    SolverTeacher,
    SolverClass,
    SolverRequirement,
    TimetableSolver,
    validate_timetable_slots
)
from app.models.timetable import TimetableSlot
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.weekly_requirement import WeeklyRequirement
from app.core.exceptions import ValidationException

router = APIRouter(
    prefix="/admin/timetable",
    tags=["Admin - Timetable Management"],
    dependencies=[Depends(require_admin)]
)

@router.post("/generate", response_model=TimetableResponse)
async def generate_timetable(
    req: TimetableGenerateRequest,
    db: AsyncSession = Depends(get_db)
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
        stmt = select(Teacher).options(
            selectinload(Teacher.subjects_expertise)
        ).where(Teacher.status == "ACTIVE")
        result = await db.execute(stmt)
        db_teachers = list(result.scalars().all())

        if not db_teachers:
            raise ValidationException("No active teachers found in the database. Create teachers first.")

        solver_teachers = [
            SolverTeacher(
                id=t.id,
                name=t.name,
                subject_expertise=[s.id for s in t.subjects_expertise],
                max_lectures_per_day=t.max_lectures_per_day,
                availability=t.availability
            ) for t in db_teachers
        ]

    # --- Resolve Classes ---
    if req.classes is not None:
        solver_classes = [
            SolverClass(id=c.id, class_name=c.class_name, division=c.division)
            for c in req.classes
        ]
    else:
        stmt = select(SchoolClass)
        result = await db.execute(stmt)
        db_classes = list(result.scalars().all())

        if not db_classes:
            raise ValidationException("No classes found in the database. Create classes first.")

        solver_classes = [
            SolverClass(id=c.id, class_name=c.class_name, division=c.division)
            for c in db_classes
        ]

    # --- Resolve Weekly Requirements ---
    if req.weekly_requirements is not None:
        solver_reqs = [
            SolverRequirement(class_id=r.class_id, subject_id=r.subject_id, periods_per_week=r.periods_per_week)
            for r in req.weekly_requirements
        ]
    else:
        stmt = select(WeeklyRequirement)
        result = await db.execute(stmt)
        db_reqs = list(result.scalars().all())

        if not db_reqs:
            raise ValidationException("No weekly requirements found in the database. Create requirements first.")

        solver_reqs = [
            SolverRequirement(class_id=r.class_id, subject_id=r.subject_id, periods_per_week=r.periods_per_week)
            for r in db_reqs
        ]

    solver_input = SolverInput(
        teachers=solver_teachers,
        classes=solver_classes,
        weekly_requirements=solver_reqs,
        school_days=req.school_days,
        periods_per_day=req.periods_per_day,
        lunch_period=req.lunch_period,
        pt_subject_id=req.pt_subject_id
    )

    solver = TimetableSolver(solver_input)
    schedule = solver.solve()

    return {
        "schedule": schedule,
        "success": True,
        "message": "Timetable generated successfully."
    }

@router.put("/", response_model=TimetableResponse)
async def save_timetable(
    req: TimetableSaveRequest,
    pt_subject_id: int = Query(..., description="ID representing Physical Training (PT)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Validates a manually adjusted timetable and commits it to the database,
    replacing the current master schedule.

    This operation is ATOMIC: if validation passes but the DB insert fails
    (e.g. unique constraint violation), the old timetable is preserved via rollback.
    """
    # 1. Fetch all teachers for daily limit checks
    teachers_res = await db.execute(select(Teacher))
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
        await db.execute(delete(TimetableSlot))
        db.add_all(new_slots)
        await db.flush()  # Forces DB to check unique constraints NOW, before commit
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
