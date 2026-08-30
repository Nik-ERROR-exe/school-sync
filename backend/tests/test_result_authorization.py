"""Authorization tests for create_result_batch (IDOR protection).

A teacher may only submit results for subjects they actually teach in the
student's class, and may not overwrite results an admin has already approved.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.exam_type import ExamType
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.teacher_class_subject import TeacherClassSubject
from app.schemas.result import ResultCreate
from app.services.result_service import create_result_batch
from app.core.exceptions import ForbiddenException, ResourceNotFoundException


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    engine.dispose()


def _seed(db):
    teacher = Teacher(
        teacher_id="T001",
        name="Teacher",
        email="teacher@school.edu",
        password_hash="x" * 60,
        role="TEACHER",
        status="ACTIVE",
    )
    db.add(teacher)
    db.flush()

    klass = SchoolClass(class_name="1", division="A")
    db.add(klass)
    db.flush()

    subject = Subject(subject_name="Mathematics", code="MATH")
    db.add(subject)
    db.flush()

    exam = ExamType(name="Unit Test")
    db.add(exam)
    db.flush()

    student = Student(roll_no="1", name="Student", class_id=klass.id)
    db.add(student)
    db.flush()

    from app.models.subject_max_marks import SubjectMaxMarks
    smm = SubjectMaxMarks(class_name=klass.class_name, subject_id=subject.id, exam_type_id=exam.id, max_marks=100.0)
    db.add(smm)
    db.flush()

    return teacher, klass, subject, exam, student



def _result(student, subject, exam):
    return ResultCreate(
        student_id=student.id,
        subject_id=subject.id,
        exam_type_id=exam.id,
        marks_obtained=85,
        total_marks=100,
    )


def test_teacher_without_assignment_is_rejected(db):
    teacher, _klass, subject, exam, student = _seed(db)

    with pytest.raises(ForbiddenException):
        create_result_batch(db, [_result(student, subject, exam)], teacher.id)


def test_teacher_assigned_in_mapping_can_submit(db):
    teacher, klass, subject, exam, student = _seed(db)
    db.add(
        TeacherClassSubject(
            teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
        )
    )
    db.commit()

    results = create_result_batch(db, [_result(student, subject, exam)], teacher.id)
    assert len(results) == 1
    assert results[0].status == "submitted"
    assert results[0].submitted_by_id == teacher.id


def test_teacher_cannot_submit_for_other_class(db):
    teacher, klass, subject, exam, student = _seed(db)
    other_class = SchoolClass(class_name="5", division="B")
    db.add(other_class)
    db.commit()
    # Teacher is assigned to the OTHER class, not this student's class.
    db.add(
        TeacherClassSubject(
            teacher_id=teacher.id, class_id=other_class.id, subject_id=subject.id
        )
    )
    db.commit()

    with pytest.raises(ForbiddenException):
        create_result_batch(db, [_result(student, subject, exam)], teacher.id)


def test_approved_result_cannot_be_overwritten(db):
    teacher, klass, subject, exam, student = _seed(db)
    db.add(
        TeacherClassSubject(
            teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
        )
    )
    db.commit()

    created = create_result_batch(db, [_result(student, subject, exam)], teacher.id)
    db.refresh(created[0])
    created[0].status = "approved"
    db.commit()

    with pytest.raises(ForbiddenException):
        create_result_batch(db, [_result(student, subject, exam)], teacher.id)


def test_missing_student_still_raises_not_found(db):
    teacher, _klass, subject, exam, _student = _seed(db)
    data = ResultCreate(
        student_id=99999, subject_id=subject.id, exam_type_id=exam.id,
        marks_obtained=85, total_marks=100,
    )
    with pytest.raises(ResourceNotFoundException):
        create_result_batch(db, [data], teacher.id)


def test_admin_can_submit_without_assignment(db):
    teacher, _klass, subject, exam, student = _seed(db)

    results = create_result_batch(db, [_result(student, subject, exam)], teacher.id, is_admin=True)
    assert len(results) == 1


def test_admin_can_overwrite_approved(db):
    teacher, klass, subject, exam, student = _seed(db)
    db.add(
        TeacherClassSubject(
            teacher_id=teacher.id, class_id=klass.id, subject_id=subject.id
        )
    )
    db.commit()

    created = create_result_batch(db, [_result(student, subject, exam)], teacher.id)
    db.refresh(created[0])
    created[0].status = "approved"
    db.commit()

    # Admin is allowed to amend an approved result.
    updated = create_result_batch(db, [_result(student, subject, exam)], teacher.id, is_admin=True)
    assert updated[0].status == "submitted"
