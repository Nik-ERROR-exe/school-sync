from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
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


async def build_solver_input(req: TimetableGenerateRequest, db: AsyncSession) -> SolverInput:
    """Build SolverInput from request data and asynchronous database lookups."""

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
        teachers_res = await db.execute(
            select(Teacher)
            .options(selectinload(Teacher.subjects_expertise))
            .where(Teacher.status == "ACTIVE")
        )
        db_teachers = teachers_res.scalars().unique().all()

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
        # The override path is used by the wizard, which only sends id /
        # class_name / division. class_teacher_id is a server-side fact and
        # must not be trusted from the client, so load it from the DB here.
        _override_ids = [c.id for c in req.classes]
        _ct_res = await db.execute(
            select(SchoolClass.id, SchoolClass.class_teacher_id).where(
                SchoolClass.id.in_(_override_ids)
            )
        )
        _ct_map: dict[int, int | None] = {row.id: row.class_teacher_id for row in _ct_res.all()}
        solver_classes = [
            SolverClass(
                id=c.id,
                class_name=c.class_name,
                division=c.division,
                class_teacher_id=_ct_map.get(c.id),
            )
            for c in req.classes
        ]
    else:
        classes_res = await db.execute(select(SchoolClass))
        db_classes = list(classes_res.scalars().all())

        if not db_classes:
            raise ValidationException("No classes found in the database. Create classes first.")

        solver_classes = [
            SolverClass(
                id=c.id,
                class_name=c.class_name,
                division=c.division,
                class_teacher_id=c.class_teacher_id
            )
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
        reqs_res = await db.execute(
            select(WeeklyRequirement).where(WeeklyRequirement.class_id.in_(generating_class_ids))
        )
        db_reqs = reqs_res.scalars().all()

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
    existing_slots_res = await db.execute(
        select(TimetableSlot).where(TimetableSlot.class_id.notin_(generating_class_ids))
    )
    existing_slots_db = existing_slots_res.scalars().all()

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
    tcs_res = await db.execute(select(TeacherClassSubject))
    tcs_rows = tcs_res.scalars().all()
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

    # --- Pre-flight: prerequisites for the "period 1 = class teacher" rule ---
    num_days = len(req.school_days)
    reqs_by_class: dict[int, set[int]] = {}
    for r in solver_reqs:
        reqs_by_class.setdefault(r.class_id, set()).add(r.subject_id)

    missing_teacher: list[str] = []
    no_eligible_subject: list[str] = []
    insufficient_periods: list[str] = []

    for c in solver_classes:
        label = f"{c.class_name}-{c.division}"
        if c.class_teacher_id is None:
            missing_teacher.append(label)
            continue
        subjects_for_class = reqs_by_class.get(c.id, set())
        eligible_total = 0
        for sub_id in subjects_for_class:
            if c.class_teacher_id in class_subject_teachers.get((c.id, sub_id), []):
                for r in solver_reqs:
                    if r.class_id == c.id and r.subject_id == sub_id:
                        eligible_total += r.periods_per_week
                        break
        if eligible_total == 0:
            no_eligible_subject.append(label)
        elif eligible_total < num_days:
            insufficient_periods.append(
                f"{label} (teacher has {eligible_total} periods, needs {num_days})"
            )

    errors: list[str] = []
    if missing_teacher:
        errors.append(
            "These classes have no class teacher assigned: "
            + ", ".join(missing_teacher)
            + ". Assign a class teacher before generating."
        )
    if no_eligible_subject:
        errors.append(
            "The class teacher of these classes does not teach any subject of that class: "
            + ", ".join(no_eligible_subject)
            + ". Give the class teacher a subject in this class before generating."
        )
    if insufficient_periods:
        errors.append(
            "The class teacher does not have enough weekly periods to cover period 1 on every school day for: "
            + "; ".join(insufficient_periods)
            + ". Increase the subject's weekly periods, add another subject for the class teacher in this class, or reduce school_days."
        )
    if errors:
        raise ValidationException(" ".join(errors))

    # Subject display names for human-readable diagnostics
    subjects_res = await db.execute(select(Subject))
    subject_names = {
        s.id: s.subject_name
        for s in subjects_res.scalars().all()
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
