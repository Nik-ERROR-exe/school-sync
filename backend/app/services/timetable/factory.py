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


def _teachable_periods_for_day(day_name, periods_per_day, lunch_period, saturday_periods):
    """Number of teachable periods on a given day."""
    if day_name == "Saturday" and saturday_periods is not None:
        cap = min(saturday_periods, periods_per_day)
    else:
        cap = periods_per_day
    if lunch_period is not None and lunch_period <= cap:
        return cap - 1
    return cap


def _adjust_requirements_for_fill(
    solver_classes,
    solver_reqs,
    class_subject_teachers,
    school_days,
    periods_per_day,
    lunch_period,
    saturday_periods,
):
    """Ensure every class's weekly requirements exactly fill its non-lunch
    slots, and that each class teacher has at least one period on every
    school day in a subject they teach to that class.

    Mutates SolverRequirement instances in place. Returns nothing.
    """
    num_days = len(school_days)
    slots_per_class = sum(
        _teachable_periods_for_day(d, periods_per_day, lunch_period, saturday_periods)
        for d in school_days
    )

    by_class: dict[int, list] = {}
    for r in solver_reqs:
        by_class.setdefault(r.class_id, []).append(r)

    for cls in solver_classes:
        reqs = by_class.get(cls.id, [])

        # Step 0: if the class has few or no SolverRequirements, seed one per
        # (class, subject) pair that has at least one teacher in
        # class_subject_teachers. This prevents Step 3 from inflating a single
        # subject to fill the entire week (which BLOCK A's no-adjacent rule
        # makes infeasible). Every seeded requirement must have a teacher —
        # otherwise the solver's x-var sum constraint is unsatisfiable.
        class_subject_pairs = sorted(
            sub_id
            for (cid, sub_id) in class_subject_teachers
            if cid == cls.id
            and class_subject_teachers.get((cls.id, sub_id))
        )
        existing_subject_ids = {r.subject_id for r in reqs}
        for sub_id in class_subject_pairs:
            if sub_id in existing_subject_ids:
                continue
            new_req = SolverRequirement(
                class_id=cls.id,
                subject_id=sub_id,
                periods_per_week=0,
            )
            solver_reqs.append(new_req)
            reqs.append(new_req)

        if not reqs:
            continue

        # Step 1: bump the class teacher's chosen subject to >= num_days
        if cls.class_teacher_id is not None:
            ct_reqs = [
                r for r in reqs
                if cls.class_teacher_id
                in class_subject_teachers.get((cls.id, r.subject_id), [])
            ]
            if ct_reqs:
                target = max(ct_reqs, key=lambda r: (r.periods_per_week, -r.subject_id))
                if target.periods_per_week < num_days:
                    target.periods_per_week = num_days

        # Step 2: reduce if total exceeds slots_per_class
        total = sum(r.periods_per_week for r in reqs)
        while total > slots_per_class:
            reducible = [
                r for r in reqs
                if r.periods_per_week > 1
                and not (
                    cls.class_teacher_id is not None
                    and cls.class_teacher_id
                    in class_subject_teachers.get((cls.id, r.subject_id), [])
                    and r.periods_per_week <= num_days
                )
            ]
            if not reducible:
                break
            biggest = max(reducible, key=lambda r: (r.periods_per_week, -r.subject_id))
            biggest.periods_per_week -= 1
            total -= 1

        # Step 3: pad if total is under slots_per_class
        while total < slots_per_class:
            for r in reqs:
                if total >= slots_per_class:
                    break
                r.periods_per_week += 1
                total += 1

        if total != slots_per_class:
            raise ValidationException(
                f"Class {cls.class_name}-{cls.division}: cannot fit the weekly "
                f"requirements into the timetable. {total} periods configured but "
                f"{slots_per_class} slots available "
                f"({len(school_days)} days x "
                f"{periods_per_day - (1 if lunch_period else 0)} non-lunch periods). "
                f"Remove subjects or reduce periods_per_week for this class."
            )


def _classify_teacher_load(solver_classes, solver_reqs, teachers,
                            class_subject_teachers, school_days,
                            periods_per_day, lunch_period, saturday_periods):
    """Return (soft_overflow, physical_overflow), each a dict
    {teacher_id: demanded_periods}. `soft` = demand > teacher's weekly
    soft cap; `physical` = demand > total teachable slots per week.
    Teachers with demand within both limits are absent from both dicts.
    """
    slots_per_week = sum(
        _teachable_periods_for_day(d, periods_per_day, lunch_period,
                                    saturday_periods)
        for d in school_days
    )
    teacher_by_id = {t.id: t for t in teachers}
    demand: dict[int, int] = {}
    for c in solver_classes:
        for r in solver_reqs:
            if r.class_id != c.id:
                continue
            for t_id in class_subject_teachers.get((c.id, r.subject_id), []):
                demand[t_id] = demand.get(t_id, 0) + r.periods_per_week
    soft: dict[int, int] = {}
    physical: dict[int, int] = {}
    for t_id, d in demand.items():
        t = teacher_by_id.get(t_id)
        if t is None:
            continue
        if d > slots_per_week:
            physical[t_id] = d
        elif d > t.max_lectures_per_day * len(school_days):
            soft[t_id] = d
    return soft, physical, slots_per_week


async def build_solver_input(req: TimetableGenerateRequest, db: AsyncSession) -> SolverInput:
    """Build SolverInput from request data and asynchronous database lookups."""

    periods_per_day = (
        req.periods_per_day if req.periods_per_day is not None
        else PERIODS_PER_DAY
    )
    lunch_period = (
        req.lunch_period if req.lunch_period is not None
        else LUNCH_PERIOD
    )

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
        subjects_for_class = {
            sub_id
            for (cid, sub_id) in class_subject_teachers
            if cid == c.id
        }
        eligible_subjects = [
            sub_id for sub_id in subjects_for_class
            if c.class_teacher_id in class_subject_teachers.get((c.id, sub_id), [])
        ]
        if not eligible_subjects:
            no_eligible_subject.append(label)

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
    if errors:
        raise ValidationException(" ".join(errors))

    # Subject display names for human-readable diagnostics
    subjects_res = await db.execute(select(Subject))
    subject_names = {
        s.id: s.subject_name
        for s in subjects_res.scalars().all()
    }

    _adjust_requirements_for_fill(
        solver_classes=solver_classes,
        solver_reqs=solver_reqs,
        class_subject_teachers=class_subject_teachers,
        school_days=req.school_days,
        periods_per_day=periods_per_day,
        lunch_period=lunch_period,
        saturday_periods=req.saturday_periods,
    )

    soft_overflow, physical_overflow, slots_per_week = _classify_teacher_load(
        solver_classes=solver_classes,
        solver_reqs=solver_reqs,
        teachers=solver_teachers,
        class_subject_teachers=class_subject_teachers,
        school_days=req.school_days,
        periods_per_day=periods_per_day,
        lunch_period=lunch_period,
        saturday_periods=req.saturday_periods,
    )

    def _label(t_id):
        t = next((x for x in solver_teachers if x.id == t_id), None)
        return t.name if t else f"Teacher #{t_id}"

    if physical_overflow and not req.allow_gaps:
        raise ValidationException(
            detail=(
                "These teachers are scheduled for more weekly periods than "
                "there are slots in the week: "
                + ", ".join(
                    f"{_label(t_id)} ({d} periods, capacity {slots_per_week})"
                    for t_id, d in physical_overflow.items()
                )
                + ". Reduce their subject assignments or add another teacher. "
                "If you proceed anyway, some periods will be left unfilled."
            ),
            code="PHYSICAL_OVERFLOW",
            teachers=[
                {"teacher_id": t_id, "teacher_name": _label(t_id),
                 "demand": d, "capacity": slots_per_week}
                for t_id, d in physical_overflow.items()
            ],
        )

    if soft_overflow and not req.relax_teacher_caps:
        raise ValidationException(
            detail=(
                "These teachers are scheduled above their daily soft cap: "
                + ", ".join(
                    f"{_label(t_id)} ({d} periods/week)"
                    for t_id, d in soft_overflow.items()
                )
                + ". You can relax their caps or redistribute their subjects."
            ),
            code="SOFT_OVERFLOW",
            teachers=[
                {"teacher_id": t_id, "teacher_name": _label(t_id),
                 "demand": d,
                 "soft_cap": next(
                     (x.max_lectures_per_day * len(req.school_days)
                      for x in solver_teachers if x.id == t_id), 0)}
                for t_id, d in soft_overflow.items()
            ],
        )

    return SolverInput(
        teachers=solver_teachers,
        classes=solver_classes,
        weekly_requirements=solver_reqs,
        school_days=req.school_days,
        periods_per_day=periods_per_day,
        lunch_period=lunch_period,
        saturday_periods=req.saturday_periods,
        relax_teacher_caps=req.relax_teacher_caps,
        allow_gaps=req.allow_gaps,
        pt_subject_id=req.pt_subject_id,
        existing_slots=solver_existing_slots,
        class_subject_teachers=class_subject_teachers,
        subject_names=subject_names,
        soft_violation_teachers=soft_overflow if req.relax_teacher_caps else {},
        physical_overflow_teachers=physical_overflow if req.allow_gaps else {},
    )
