"""Authorization tests for create_result_batch (IDOR protection).

A teacher may only submit results for subjects they actually teach in the
student's class, and may not overwrite results an admin has already approved.
"""
import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam_type import ExamType
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.subject_max_marks import SubjectMaxMarks
from app.schemas.result import ResultCreate
from app.services.result_service import create_result_batch
from app.core.exceptions import ForbiddenException, ResourceNotFoundException, ValidationException


async def _seed(db: AsyncSession):
    teacher = Teacher(
        teacher_id="T001",
        name="Teacher",
        email="teacher@school.edu",
        password_hash="x" * 60,
        role="TEACHER",
        status="ACTIVE",
    )
    db.add(teacher)
    await db.flush()

    klass = SchoolClass(class_name="1", division="A")
    db.add(klass)
    await db.flush()

    subject = Subject(subject_name="Mathematics", code="MATH")
    db.add(subject)
    await db.flush()

    exam = ExamType(name="Unit Test")
    db.add(exam)
    await db.flush()

    student = Student(roll_no="1", name="Student", class_id=klass.id)
    db.add(student)
    await db.flush()

    smm = SubjectMaxMarks(class_name=klass.class_name, subject_id=subject.id, exam_type_id=exam.id, max_marks=100.0)
    db.add(smm)
    await db.flush()

    return teacher, klass, subject, exam, student


def _result(student, subject, exam):
    return ResultCreate(
        student_id=student.id,
        subject_id=subject.id,
        exam_type_id=exam.id,
        marks_obtained=85,
        total_marks=100,
    )


def _result_with_marks(student, subject, exam, marks):
    return ResultCreate(
        student_id=student.id,
        subject_id=subject.id,
        exam_type_id=exam.id,
        marks_obtained=marks,
        total_marks=100,
    )


@pytest.mark.asyncio
async def test_teacher_without_assignment_is_rejected(db: AsyncSession):
    teacher, _klass, subject, exam, student = await _seed(db)

    with pytest.raises(ForbiddenException):
        await create_result_batch(db, [_result(student, subject, exam)], teacher.id)


@pytest.mark.asyncio
async def test_teacher_assigned_in_mapping_can_submit(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)
    db.add(
        TeacherClassSubject(
            teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
        )
    )
    await db.commit()

    results = await create_result_batch(db, [_result(student, subject, exam)], teacher.id)
    assert len(results) == 1
    assert results[0].status == "submitted"
    assert results[0].submitted_by_id == teacher.id


@pytest.mark.asyncio
async def test_teacher_cannot_submit_for_other_class(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)
    other_class = SchoolClass(class_name="5", division="B")
    db.add(other_class)
    await db.commit()
    # Teacher is assigned to the OTHER class, not this student's class.
    db.add(
        TeacherClassSubject(
            teacher_id=teacher.id, class_id=other_class.id, subject_id=subject.id
        )
    )
    await db.commit()

    with pytest.raises(ForbiddenException):
        await create_result_batch(db, [_result(student, subject, exam)], teacher.id)


@pytest.mark.asyncio
async def test_approved_result_cannot_be_overwritten(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)
    db.add(
        TeacherClassSubject(
            teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
        )
    )
    await db.commit()

    created = await create_result_batch(db, [_result(student, subject, exam)], teacher.id)
    await db.refresh(created[0])
    created[0].status = "approved"
    await db.commit()

    with pytest.raises(ForbiddenException):
        await create_result_batch(db, [_result(student, subject, exam)], teacher.id)


@pytest.mark.asyncio
async def test_missing_student_still_raises_not_found(db: AsyncSession):
    teacher, _klass, subject, exam, _student = await _seed(db)
    data = ResultCreate(
        student_id=99999, subject_id=subject.id, exam_type_id=exam.id,
        marks_obtained=85, total_marks=100,
    )
    with pytest.raises(ResourceNotFoundException):
        await create_result_batch(db, [data], teacher.id)


@pytest.mark.asyncio
async def test_admin_can_submit_without_assignment(db: AsyncSession):
    teacher, _klass, subject, exam, student = await _seed(db)

    results = await create_result_batch(db, [_result(student, subject, exam)], teacher.id, is_admin=True)
    assert len(results) == 1


@pytest.mark.asyncio
async def test_admin_can_overwrite_approved(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)
    db.add(
        TeacherClassSubject(
            teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
        )
    )
    await db.commit()

    created = await create_result_batch(db, [_result(student, subject, exam)], teacher.id)
    await db.refresh(created[0])
    created[0].status = "approved"
    await db.commit()

    # Admin is allowed to amend an approved result.
    updated = await create_result_batch(db, [_result(student, subject, exam)], teacher.id, is_admin=True)
    assert updated[0].status == "submitted"


# --- Marks bounds validation tests (0 <= marks_obtained <= configured max_marks) ---


@pytest.mark.asyncio
async def test_teacher_zero_marks_is_accepted(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)
    db.add(TeacherClassSubject(
        teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
    ))
    await db.commit()

    results = await create_result_batch(
        db, [_result_with_marks(student, subject, exam, 0)], teacher.id
    )
    assert len(results) == 1
    assert results[0].marks_obtained == 0


@pytest.mark.asyncio
async def test_teacher_negative_marks_is_rejected(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)
    db.add(TeacherClassSubject(
        teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
    ))
    await db.commit()

    # Pydantic schema rejects negative marks before the service layer
    with pytest.raises((ValidationException, ValidationError)):
        await create_result_batch(
            db, [_result_with_marks(student, subject, exam, -1)], teacher.id
        )


@pytest.mark.asyncio
async def test_teacher_exact_max_marks_is_accepted(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)
    db.add(TeacherClassSubject(
        teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
    ))
    await db.commit()

    # SubjectMaxMarks for this class/exam/subject = 100.0
    results = await create_result_batch(
        db, [_result_with_marks(student, subject, exam, 100)], teacher.id
    )
    assert len(results) == 1
    assert results[0].marks_obtained == 100


@pytest.mark.asyncio
async def test_teacher_exceeds_max_marks_is_rejected(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)
    db.add(TeacherClassSubject(
        teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
    ))
    await db.commit()

    with pytest.raises(ValidationException):
        await create_result_batch(
            db, [_result_with_marks(student, subject, exam, 101)], teacher.id
        )


@pytest.mark.asyncio
async def test_teacher_custom_max_marks_bounds(db: AsyncSession):
    """Verify 0 <= marks <= subject-specific configured max (e.g. 25)."""
    teacher = Teacher(
        teacher_id="T002",
        name="Teacher2",
        email="teacher2@school.edu",
        password_hash="x" * 60,
        role="TEACHER",
        status="ACTIVE",
    )
    db.add(teacher)
    await db.flush()

    klass = SchoolClass(class_name="2", division="B")
    db.add(klass)
    await db.flush()

    subject = Subject(subject_name="Science", code="SCI")
    db.add(subject)
    await db.flush()

    exam = ExamType(name="Quiz")
    db.add(exam)
    await db.flush()

    db.add(SubjectMaxMarks(class_name=klass.class_name, subject_id=subject.id, exam_type_id=exam.id, max_marks=25.0))
    await db.commit()

    student = Student(roll_no="1", name="Student", class_id=klass.id)
    db.add(student)
    await db.commit()

    db.add(TeacherClassSubject(teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id))
    await db.commit()

    # 0 is accepted
    res0 = await create_result_batch(db, [_result_with_marks(student, subject, exam, 0)], teacher.id)
    assert res0[0].marks_obtained == 0

    # 25 is accepted (exact max)
    res25 = await create_result_batch(db, [_result_with_marks(student, subject, exam, 25)], teacher.id)
    assert res25[0].marks_obtained == 25

    # 26 is rejected
    with pytest.raises(ValidationException):
        await create_result_batch(db, [_result_with_marks(student, subject, exam, 26)], teacher.id)


@pytest.mark.asyncio
async def test_admin_zero_marks_is_accepted(db: AsyncSession):
    teacher, klass, subject, exam, student = await _seed(db)

    results = await create_result_batch(
        db, [_result_with_marks(student, subject, exam, 0)], teacher.id, is_admin=True
    )
    assert len(results) == 1
    assert results[0].marks_obtained == 0


@pytest.mark.asyncio
async def test_admin_negative_marks_is_rejected(db: AsyncSession):
    teacher, _klass, subject, exam, student = await _seed(db)

    # Pydantic schema rejects negative marks before the service layer
    with pytest.raises((ValidationException, ValidationError)):
        await create_result_batch(
            db, [_result_with_marks(student, subject, exam, -5)], teacher.id, is_admin=True
        )


@pytest.mark.asyncio
async def test_admin_custom_max_marks_bounds(db: AsyncSession):
    """Admin with max_marks=50: 0 and 50 accepted, 51 rejected."""
    teacher = Teacher(
        teacher_id="T003",
        name="Admin3",
        email="admin3@school.edu",
        password_hash="x" * 60,
        role="ADMIN",
        status="ACTIVE",
    )
    db.add(teacher)
    await db.flush()

    klass = SchoolClass(class_name="3", division="C")
    db.add(klass)
    await db.flush()

    subject = Subject(subject_name="English", code="ENG")
    db.add(subject)
    await db.flush()

    exam = ExamType(name="Final")
    db.add(exam)
    await db.flush()

    db.add(SubjectMaxMarks(class_name=klass.class_name, subject_id=subject.id, exam_type_id=exam.id, max_marks=50.0))
    await db.commit()

    student = Student(roll_no="1", name="Student", class_id=klass.id)
    db.add(student)
    await db.commit()

    # 0 accepted
    res0 = await create_result_batch(db, [_result_with_marks(student, subject, exam, 0)], teacher.id, is_admin=True)
    assert res0[0].marks_obtained == 0

    # 50 accepted
    res50 = await create_result_batch(db, [_result_with_marks(student, subject, exam, 50)], teacher.id, is_admin=True)
    assert res50[0].marks_obtained == 50

    # 51 rejected
    with pytest.raises(ValidationException):
        await create_result_batch(db, [_result_with_marks(student, subject, exam, 51)], teacher.id, is_admin=True)
