from sqlalchemy.orm import Session, joinedload
from sqlalchemy.future import select

from app.services.timetable.models_internal import (
    SolverInput,
    SolverTeacher,
    SolverClass,
    SolverRequirement,
    SolverSlot,
)
from app.services.timetable.period_schedule import PERIODS_PER_DAY, LUNCH_PERIOD
from app.schemas.timetable import TimetableGenerateRequest
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.weekly_requirement import WeeklyRequirement
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.subject import Subject
from app.models.timetable import TimetableSlot
from app.core.date_utils import int_to_day
from app.core.exceptions import ValidationException


def build_solver_input(req: TimetableGenerateRequest, db: Session) -> SolverInput:
    """Build SolverInput from request data and database lookups."""

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
        db_classes = list(db.execute(select(SchoolClass)).scalars().all())

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
        db_reqs = db.execute(
            select(WeeklyRequirement).where(WeeklyRequirement.class_id.in_(generating_class_ids))
        ).scalars().all()

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
    class_subject_teachers: dict[tuple[int, int], list[int]] = {}
    for row in tcs_rows:
        key = (row.class_id, row.subject_id)
        if key not in class_subject_teachers:
            class_subject_teachers[key] = []
        class_subject_teachers[key].append(row.teacher_id)

    # Apply admin teacher overrides (issue #5: popup selection for multi-teacher subjects)
    if req.subject_teacher_assignments:
        for key_str, teacher_id in req.subject_teacher_assignments.items():
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

    return SolverInput(
        teachers=solver_teachers,
        classes=solver_classes,
        weekly_requirements=solver_reqs,
        school_days=req.school_days,
        periods_per_day=PERIODS_PER_DAY,
        lunch_period=LUNCH_PERIOD,
        pt_subject_id=req.pt_subject_id,
        existing_slots=solver_existing_slots,
        class_subject_teachers=class_subject_teachers,
        subject_names=subject_names,
    )
