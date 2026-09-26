import pytest

from app.services.timetable.models_internal import (
    SolverInput,
    SolverTeacher,
    SolverClass,
    SolverRequirement,
)
from app.services.timetable.solver import TimetableSolver
from app.core.exceptions import ValidationException


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday"]


def test_period_1_is_class_teacher_two_classes():
    """Each class teacher's single subject covers every day, so period 1 is theirs."""
    teachers = [
        SolverTeacher(id=1, name="CT 8A", subject_expertise=[101], max_lectures_per_day=4),
        SolverTeacher(id=2, name="CT 8B", subject_expertise=[102], max_lectures_per_day=4),
        SolverTeacher(id=3, name="Other", subject_expertise=[103], max_lectures_per_day=4),
    ]
    classes = [
        SolverClass(id=1, class_name="8", division="A", class_teacher_id=1),
        SolverClass(id=2, class_name="8", division="B", class_teacher_id=2),
    ]
    # Class 1: 101 (its class teacher) + 103 = 4 + 4 periods over 4 days.
    requirements = [
        SolverRequirement(class_id=1, subject_id=101, periods_per_week=4),
        SolverRequirement(class_id=1, subject_id=103, periods_per_week=4),
        SolverRequirement(class_id=2, subject_id=102, periods_per_week=4),
        SolverRequirement(class_id=2, subject_id=103, periods_per_week=4),
    ]

    solver_input = SolverInput(
        teachers=teachers,
        classes=classes,
        weekly_requirements=requirements,
        school_days=DAYS,
        periods_per_day=3,
        lunch_period=2,
        pt_subject_id=103,
        class_subject_teachers={
            (1, 101): [1],
            (1, 103): [3],
            (2, 102): [2],
            (2, 103): [3],
        },
    )

    schedule = TimetableSolver(solver_input).solve()

    expected = {1: (1, 101), 2: (2, 102)}  # class_id -> (teacher_id, subject_id)
    first_periods = [
        s for s in schedule
        if s["period_number"] == 1 and s["day_of_week"] in DAYS
    ]
    assert len(first_periods) == len(DAYS) * len(classes)

    for slot in first_periods:
        teacher_id, subject_id = expected[slot["class_id"]]
        assert slot["teacher_id"] == teacher_id
        assert slot["subject_id"] == subject_id


def test_period_1_is_class_teacher_with_two_subjects():
    """The class teacher owns two subjects; period 1 is still theirs on every day."""
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    teachers = [
        SolverTeacher(id=1, name="CT", subject_expertise=[201, 202], max_lectures_per_day=4),
        SolverTeacher(id=2, name="Other", subject_expertise=[203], max_lectures_per_day=4),
    ]
    classes = [SolverClass(id=1, class_name="9", division="A", class_teacher_id=1)]
    # 4 + 2 = 6 periods over 6 days; both belong to the class teacher.
    requirements = [
        SolverRequirement(class_id=1, subject_id=201, periods_per_week=4),
        SolverRequirement(class_id=1, subject_id=202, periods_per_week=2),
    ]

    solver_input = SolverInput(
        teachers=teachers,
        classes=classes,
        weekly_requirements=requirements,
        school_days=days,
        periods_per_day=3,
        lunch_period=2,
        pt_subject_id=203,
        class_subject_teachers={
            (1, 201): [1],
            (1, 202): [1],
        },
    )

    schedule = TimetableSolver(solver_input).solve()

    first_periods = [s for s in schedule if s["period_number"] == 1]
    assert len(first_periods) == len(days)

    days_seen = set()
    for slot in first_periods:
        assert slot["teacher_id"] == 1
        assert slot["subject_id"] in (201, 202)
        days_seen.add(slot["day_of_week"])
    assert days_seen == set(days)


def test_period_1_raises_when_teacher_runs_out_of_periods():
    """Bypassing the factory: the solver itself must refuse an under-supplied teacher."""
    teachers = [
        SolverTeacher(id=1, name="CT", subject_expertise=[301], max_lectures_per_day=4),
        SolverTeacher(id=2, name="Other", subject_expertise=[302], max_lectures_per_day=4),
    ]
    classes = [SolverClass(id=1, class_name="9", division="A", class_teacher_id=1)]
    # Teacher's subject has only 2 periods but there are 4 school days.
    # The remaining 6 periods are filled by the other teacher.
    requirements = [
        SolverRequirement(class_id=1, subject_id=301, periods_per_week=2),
        SolverRequirement(class_id=1, subject_id=302, periods_per_week=6),
    ]

    solver_input = SolverInput(
        teachers=teachers,
        classes=classes,
        weekly_requirements=requirements,
        school_days=DAYS,
        periods_per_day=3,
        lunch_period=2,
        pt_subject_id=302,
        class_subject_teachers={
            (1, 301): [1],
            (1, 302): [2],
        },
    )

    with pytest.raises(ValidationException) as exc:
        TimetableSolver(solver_input).solve()
    assert "no remaining periods" in str(exc.value)


def test_missing_class_teacher_raises():
    """A class without a class teacher is rejected by the solver pre-fill."""
    teachers = [
        SolverTeacher(id=1, name="T1", subject_expertise=[401], max_lectures_per_day=4),
    ]
    classes = [SolverClass(id=1, class_name="9", division="A", class_teacher_id=None)]
    requirements = [
        SolverRequirement(class_id=1, subject_id=401, periods_per_week=4),
    ]

    solver_input = SolverInput(
        teachers=teachers,
        classes=classes,
        weekly_requirements=requirements,
        school_days=DAYS,
        periods_per_day=3,
        lunch_period=2,
        pt_subject_id=401,
        class_subject_teachers={(1, 401): [1]},
    )

    with pytest.raises(ValidationException) as exc:
        TimetableSolver(solver_input).solve()
    assert "has no class teacher" in str(exc.value)
