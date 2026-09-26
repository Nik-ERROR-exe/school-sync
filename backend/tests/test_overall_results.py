import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam_type import ExamType
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.subject_exam_component import SubjectExamComponent
from app.models.teacher import Teacher
from app.schemas.result import ResultCreateWithComponents
from app.schemas.result_component import ResultComponentEntry
from app.services.result_service import (
    get_grading_scale_group,
    calculate_overall_grade,
    calculate_class_overall_results,
    create_result_batch_with_components,
)


def test_grading_scale_group_detection():
    assert get_grading_scale_group("1 A") == "STD_1_8"
    assert get_grading_scale_group("2 B") == "STD_1_8"
    assert get_grading_scale_group("Std 5 A") == "STD_1_8"
    assert get_grading_scale_group("8 C") == "STD_1_8"
    assert get_grading_scale_group("9 A") == "STD_9_10"
    assert get_grading_scale_group("10 B 2026-27") == "STD_9_10"
    assert get_grading_scale_group("Std 10 C") == "STD_9_10"


def test_unified_grading_scale_boundaries():
    # Unified 7-tier scale applied to every class
    assert calculate_overall_grade(100.0, "STD_1_8") == "A1"
    assert calculate_overall_grade(91.0, "STD_1_8") == "A1"
    assert calculate_overall_grade(90.99, "STD_1_8") == "A2"
    assert calculate_overall_grade(81.0, "STD_1_8") == "A2"
    assert calculate_overall_grade(80.99, "STD_1_8") == "B1"
    assert calculate_overall_grade(71.0, "STD_1_8") == "B1"
    assert calculate_overall_grade(70.99, "STD_1_8") == "B2"
    assert calculate_overall_grade(61.0, "STD_1_8") == "B2"
    assert calculate_overall_grade(60.99, "STD_1_8") == "C1"
    assert calculate_overall_grade(51.0, "STD_1_8") == "C1"
    assert calculate_overall_grade(50.99, "STD_1_8") == "C2"
    assert calculate_overall_grade(41.0, "STD_1_8") == "C2"
    assert calculate_overall_grade(40.99, "STD_1_8") == "D"
    assert calculate_overall_grade(40.0, "STD_1_8") == "D"
    assert calculate_overall_grade(0.0, "STD_1_8") == "D"

    # Same scale for the STD_9_10 group (scale_group is now ignored)
    assert calculate_overall_grade(91.0, "STD_9_10") == "A1"
    assert calculate_overall_grade(85.0, "STD_9_10") == "A2"
    assert calculate_overall_grade(75.0, "STD_9_10") == "B1"
    assert calculate_overall_grade(65.0, "STD_9_10") == "B2"
    assert calculate_overall_grade(55.0, "STD_9_10") == "C1"
    assert calculate_overall_grade(45.0, "STD_9_10") == "C2"
    assert calculate_overall_grade(20.0, "STD_9_10") == "D"


@pytest.mark.asyncio
async def test_calculate_class_overall_results_and_ranks(db: AsyncSession):
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
    await db.flush()

    klass = SchoolClass(class_name="1", division="A")
    db.add(klass)
    await db.flush()

    s1 = Subject(subject_name="Marathi", code="MAR")
    s2 = Subject(subject_name="English", code="ENG")
    s3 = Subject(subject_name="Math", code="MAT")
    db.add_all([s1, s2, s3])
    await db.flush()

    exam = ExamType(name="First Unit Test")
    db.add(exam)
    await db.flush()

    # One MAIN component of 10 marks per subject for this class/exam
    for s in (s1, s2, s3):
        db.add(SubjectExamComponent(
            class_name=klass.class_name,
            subject_id=s.id,
            exam_type_id=exam.id,
            component_code="MAIN",
            display_label="Main",
            max_marks=10.0,
            display_order=1,
        ))
    await db.flush()

    st1 = Student(roll_no="1", name="Student One", class_id=klass.id)
    st2 = Student(roll_no="2", name="Student Two", class_id=klass.id)
    st3 = Student(roll_no="3", name="Student Three", class_id=klass.id)
    st4 = Student(roll_no="4", name="Student Four", class_id=klass.id)
    db.add_all([st1, st2, st3, st4])
    await db.commit()

    # Create results (total 30 marks per student across 3 subjects of 10 marks each)
    batch_data = [
        # Student 1: 10 + 9 + 9 = 28/30 (93.33%) -> Rank 1
        ResultCreateWithComponents(student_id=st1.id, subject_id=s1.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=10)]),
        ResultCreateWithComponents(student_id=st1.id, subject_id=s2.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=9)]),
        ResultCreateWithComponents(student_id=st1.id, subject_id=s3.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=9)]),

        # Student 2: 8 + 8 + 8 = 24/30 (80.00%) -> Tied Rank 2
        ResultCreateWithComponents(student_id=st2.id, subject_id=s1.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=8)]),
        ResultCreateWithComponents(student_id=st2.id, subject_id=s2.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=8)]),
        ResultCreateWithComponents(student_id=st2.id, subject_id=s3.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=8)]),

        # Student 3: 9 + 8 + 7 = 24/30 (80.00%) -> Tied Rank 2
        ResultCreateWithComponents(student_id=st3.id, subject_id=s1.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=9)]),
        ResultCreateWithComponents(student_id=st3.id, subject_id=s2.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=8)]),
        ResultCreateWithComponents(student_id=st3.id, subject_id=s3.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=7)]),

        # Student 4: 5 + 5 + 5 = 15/30 (50.00%) -> Rank 4 (skipped 3 due to tie)
        ResultCreateWithComponents(student_id=st4.id, subject_id=s1.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=5)]),
        ResultCreateWithComponents(student_id=st4.id, subject_id=s2.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=5)]),
        ResultCreateWithComponents(student_id=st4.id, subject_id=s3.id, exam_type_id=exam.id, components=[ResultComponentEntry(component_code="MAIN", marks_obtained=5)]),
    ]

    await create_result_batch_with_components(db, batch_data, teacher.id, is_admin=True)

    summary = await calculate_class_overall_results(db, klass.id, exam.id)

    # Student 1 verification: 28/30 = 93.33% -> "A1", Rank 1
    assert summary[st1.id]["total_obtained"] == 28.0
    assert summary[st1.id]["total_max"] == 30.0
    assert summary[st1.id]["percentage"] == 93.33
    # Grade scale unified to A1/A2/B1/B2/C1/C2/D in Stage 1.
    assert summary[st1.id]["grade"] == "A1"
    assert summary[st1.id]["rank"] == 1

    # Student 2 & 3 verification: 24/30 = 80% -> "B1", Rank 2
    assert summary[st2.id]["percentage"] == 80.0
    # Grade scale unified to A1/A2/B1/B2/C1/C2/D in Stage 1.
    assert summary[st2.id]["grade"] == "B1"
    assert summary[st2.id]["rank"] == 2

    assert summary[st3.id]["percentage"] == 80.0
    # Grade scale unified to A1/A2/B1/B2/C1/C2/D in Stage 1.
    assert summary[st3.id]["grade"] == "B1"
    assert summary[st3.id]["rank"] == 2

    # Student 4 verification: 15/30 = 50% -> "C2" since P>=41, Rank 4
    assert summary[st4.id]["percentage"] == 50.0
    # Grade scale unified to A1/A2/B1/B2/C1/C2/D in Stage 1.
    assert summary[st4.id]["grade"] == "C2"
    assert summary[st4.id]["rank"] == 4
