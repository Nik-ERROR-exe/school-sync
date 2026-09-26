import pytest

from app.core.exceptions import ValidationException
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.weekly_requirement import WeeklyRequirement
from app.schemas.timetable import TimetableGenerateRequest
from app.services.timetable.factory import build_solver_input


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday"]


async def _seed(db, class_teacher_ids, tcs, requirements, teacher_status="ACTIVE"):
    """Create subjects 901-903, teachers 1..N, classes, mappings and requirements."""
    for sid in (901, 902, 903):
        db.add(Subject(id=sid, subject_name=f"Subject {sid}"))

    for tid, name in ((1, "Teacher One"), (2, "Teacher Two")):
        db.add(
            Teacher(
                id=tid,
                name=name,
                email=f"{name.lower().replace(' ', '.')}@example.com",
                password_hash="x",
                role="TEACHER",
                status=teacher_status,
                max_lectures_per_day=8,
            )
        )

    for cid, (class_name, division, ct_id) in class_teacher_ids.items():
        db.add(SchoolClass(id=cid, class_name=class_name, division=division, class_teacher_id=ct_id))

    for teacher_id, class_id, subject_id in tcs:
        db.add(TeacherClassSubject(teacher_id=teacher_id, class_id=class_id, subject_id=subject_id))

    for class_id, subject_id, periods in requirements:
        db.add(
            WeeklyRequirement(
                class_id=class_id, subject_id=subject_id, periods_per_week=periods
            )
        )

    await db.commit()


async def test_factory_rejects_class_without_class_teacher(db):
    await _seed(
        db,
        class_teacher_ids={1: ("8", "A", None)},
        tcs=[(1, 1, 901)],
        requirements=[(1, 901, 4)],
    )

    req = TimetableGenerateRequest(school_days=DAYS, pt_subject_id=903)

    with pytest.raises(ValidationException) as exc:
        await build_solver_input(req, db)
    assert "no class teacher" in str(exc.value)


async def test_factory_rejects_teacher_who_teaches_no_subject_of_class(db):
    # Class 1's class teacher is 1, but teacher 1 has no teacher_class_subject row
    # for any subject required by class 1.
    await _seed(
        db,
        class_teacher_ids={1: ("8", "A", 1)},
        tcs=[(2, 1, 901)],
        requirements=[(1, 901, 4)],
    )

    req = TimetableGenerateRequest(school_days=DAYS, pt_subject_id=903)

    with pytest.raises(ValidationException) as exc:
        await build_solver_input(req, db)
    assert "does not teach any subject" in str(exc.value)


async def test_factory_rejects_insufficient_weekly_periods(db):
    # Teacher 1 is the class teacher and teaches 901, but only 2 periods/week
    # while there are 4 school days.
    await _seed(
        db,
        class_teacher_ids={1: ("8", "A", 1)},
        tcs=[(1, 1, 901), (2, 1, 902)],
        requirements=[(1, 901, 2), (1, 902, 6)],
    )

    req = TimetableGenerateRequest(school_days=DAYS, pt_subject_id=903)

    with pytest.raises(ValidationException) as exc:
        await build_solver_input(req, db)
    assert "not enough weekly periods" in str(exc.value)


async def test_factory_accepts_two_valid_classes(db):
    await _seed(
        db,
        class_teacher_ids={1: ("8", "A", 1), 2: ("8", "B", 2)},
        tcs=[(1, 1, 901), (2, 2, 902)],
        requirements=[(1, 901, 4), (2, 902, 4)],
    )

    req = TimetableGenerateRequest(school_days=DAYS, pt_subject_id=903)

    solver_input = await build_solver_input(req, db)

    by_id = {c.id: c for c in solver_input.classes}
    assert by_id[1].class_teacher_id == 1
    assert by_id[2].class_teacher_id == 2
