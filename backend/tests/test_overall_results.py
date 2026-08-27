import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.exam_type import ExamType
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.schemas.result import ResultCreate
from app.services.result_service import (
    calculate_grade_and_percentage,
    get_grading_scale_group,
    calculate_overall_grade,
    calculate_class_overall_results,
    create_result_batch,
)


def test_grading_scale_group_detection():
    assert get_grading_scale_group("1 A") == "STD_1_8"
    assert get_grading_scale_group("2 B") == "STD_1_8"
    assert get_grading_scale_group("Std 5 A") == "STD_1_8"
    assert get_grading_scale_group("8 C") == "STD_1_8"
    assert get_grading_scale_group("9 A") == "STD_9_10"
    assert get_grading_scale_group("10 B 2026-27") == "STD_9_10"
    assert get_grading_scale_group("Std 10 C") == "STD_9_10"


def test_std_1_8_grading_scale_boundaries():
    # Std 1-8 8-tier scale
    assert calculate_overall_grade(95.0, "STD_1_8") == "A 1"
    assert calculate_overall_grade(91.0, "STD_1_8") == "A 1"
    assert calculate_overall_grade(90.99, "STD_1_8") == "A 2"
    assert calculate_overall_grade(81.0, "STD_1_8") == "A 2"
    assert calculate_overall_grade(80.99, "STD_1_8") == "ba 1"
    assert calculate_overall_grade(71.0, "STD_1_8") == "ba 1"
    assert calculate_overall_grade(70.99, "STD_1_8") == "ba 2"
    assert calculate_overall_grade(61.0, "STD_1_8") == "ba 2"
    assert calculate_overall_grade(60.99, "STD_1_8") == "k  1"
    assert calculate_overall_grade(51.0, "STD_1_8") == "k  1"
    assert calculate_overall_grade(50.99, "STD_1_8") == "k  2"
    assert calculate_overall_grade(41.0, "STD_1_8") == "k  2"
    assert calculate_overall_grade(40.0, "STD_1_8") == "D"
    assert calculate_overall_grade(20.0, "STD_1_8") == "D"  # Dead-code branch preserved as unreachable
    assert calculate_overall_grade(0.0, "STD_1_8") == "D"


def test_std_9_10_grading_scale_boundaries():
    # Std 9-10 5-tier scale
    assert calculate_overall_grade(85.0, "STD_9_10") == "A "
    assert calculate_overall_grade(75.0, "STD_9_10") == "A "
    assert calculate_overall_grade(74.99, "STD_9_10") == "ba"
    assert calculate_overall_grade(60.0, "STD_9_10") == "ba"
    assert calculate_overall_grade(59.99, "STD_9_10") == "k"
    assert calculate_overall_grade(49.0, "STD_9_10") == "k"
    assert calculate_overall_grade(48.99, "STD_9_10") == "D"
    assert calculate_overall_grade(35.0, "STD_9_10") == "D"
    assert calculate_overall_grade(34.99, "STD_9_10") == "["
    assert calculate_overall_grade(0.0, "STD_9_10") == "["


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    engine.dispose()


def test_calculate_class_overall_results_and_ranks(db):
    # Setup teacher and class (Std 1 A)
    teacher = Teacher(
        teacher_id="T101",
        name="Test Teacher",
        email="teacher@school.edu",
        password_hash="pass",
        role="TEACHER",
        status="ACTIVE",
    )
    db.add(teacher)
    db.flush()

    klass = SchoolClass(class_name="1", division="A")
    db.add(klass)
    db.flush()

    s1 = Subject(subject_name="Marathi", code="MAR")
    s2 = Subject(subject_name="English", code="ENG")
    s3 = Subject(subject_name="Math", code="MAT")
    db.add_all([s1, s2, s3])
    db.flush()

    exam = ExamType(name="First Unit Test")
    db.add(exam)
    db.flush()

    from app.models.subject_max_marks import SubjectMaxMarks
    smm1 = SubjectMaxMarks(class_name=klass.class_name, subject_id=s1.id, exam_type_id=exam.id, max_marks=10.0)
    smm2 = SubjectMaxMarks(class_name=klass.class_name, subject_id=s2.id, exam_type_id=exam.id, max_marks=10.0)
    smm3 = SubjectMaxMarks(class_name=klass.class_name, subject_id=s3.id, exam_type_id=exam.id, max_marks=10.0)
    db.add_all([smm1, smm2, smm3])
    db.flush()


    st1 = Student(roll_no="1", name="Student One", class_id=klass.id)
    st2 = Student(roll_no="2", name="Student Two", class_id=klass.id)
    st3 = Student(roll_no="3", name="Student Three", class_id=klass.id)
    st4 = Student(roll_no="4", name="Student Four", class_id=klass.id)
    db.add_all([st1, st2, st3, st4])
    db.commit()

    # Create results (total 30 marks per student across 3 subjects of 10 marks each)
    batch_data = [
        # Student 1: 10 + 9 + 9 = 28/30 (93.33%) -> Rank 1
        ResultCreate(student_id=st1.id, subject_id=s1.id, exam_type_id=exam.id, marks_obtained=10, total_marks=10),
        ResultCreate(student_id=st1.id, subject_id=s2.id, exam_type_id=exam.id, marks_obtained=9, total_marks=10),
        ResultCreate(student_id=st1.id, subject_id=s3.id, exam_type_id=exam.id, marks_obtained=9, total_marks=10),

        # Student 2: 8 + 8 + 8 = 24/30 (80.00%) -> Tied Rank 2
        ResultCreate(student_id=st2.id, subject_id=s1.id, exam_type_id=exam.id, marks_obtained=8, total_marks=10),
        ResultCreate(student_id=st2.id, subject_id=s2.id, exam_type_id=exam.id, marks_obtained=8, total_marks=10),
        ResultCreate(student_id=st2.id, subject_id=s3.id, exam_type_id=exam.id, marks_obtained=8, total_marks=10),

        # Student 3: 9 + 8 + 7 = 24/30 (80.00%) -> Tied Rank 2
        ResultCreate(student_id=st3.id, subject_id=s1.id, exam_type_id=exam.id, marks_obtained=9, total_marks=10),
        ResultCreate(student_id=st3.id, subject_id=s2.id, exam_type_id=exam.id, marks_obtained=8, total_marks=10),
        ResultCreate(student_id=st3.id, subject_id=s3.id, exam_type_id=exam.id, marks_obtained=7, total_marks=10),

        # Student 4: 5 + 5 + 5 = 15/30 (50.00%) -> Rank 4 (skipped 3 due to tie)
        ResultCreate(student_id=st4.id, subject_id=s1.id, exam_type_id=exam.id, marks_obtained=5, total_marks=10),
        ResultCreate(student_id=st4.id, subject_id=s2.id, exam_type_id=exam.id, marks_obtained=5, total_marks=10),
        ResultCreate(student_id=st4.id, subject_id=s3.id, exam_type_id=exam.id, marks_obtained=5, total_marks=10),
    ]

    create_result_batch(db, batch_data, teacher.id, is_admin=True)

    summary = calculate_class_overall_results(db, klass.id, exam.id)

    # Student 1 verification: 28/30 = 93.33% -> "A 1", Rank 1
    assert summary[st1.id]["total_obtained"] == 28.0
    assert summary[st1.id]["total_max"] == 30.0
    assert summary[st1.id]["percentage"] == 93.33
    assert summary[st1.id]["grade"] == "A 1"
    assert summary[st1.id]["rank"] == 1

    # Student 2 & 3 verification: 24/30 = 80% -> "ba 1", Rank 2
    assert summary[st2.id]["percentage"] == 80.0
    assert summary[st2.id]["grade"] == "ba 1"
    assert summary[st2.id]["rank"] == 2

    assert summary[st3.id]["percentage"] == 80.0
    assert summary[st3.id]["grade"] == "ba 1"
    assert summary[st3.id]["rank"] == 2

    # Student 4 verification: 15/30 = 50% -> "D" (<=40 is D, 50% is "k  2" since P>=41), Rank 4
    assert summary[st4.id]["percentage"] == 50.0
    assert summary[st4.id]["grade"] == "k  2"
    assert summary[st4.id]["rank"] == 4
