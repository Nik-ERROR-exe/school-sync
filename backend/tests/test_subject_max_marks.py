import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.subject_max_marks import SubjectMaxMarks
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.teacher_class import TeacherClass
from app.models.teacher_class_subject import TeacherClassSubject
from app.core.security import create_access_token


@pytest.fixture
def test_setup(db: Session):
    """Setup clean test environment for subject max marks tests."""
    # Cleanup previous records
    db.query(SubjectMaxMarks).delete()
    db.query(TeacherClassSubject).delete()
    db.query(TeacherClass).delete()
    db.query(Student).delete()
    db.query(Teacher).delete()
    db.query(SchoolClass).delete()
    db.query(Subject).delete()
    db.query(ExamType).delete()
    db.commit()

    # Create admin
    admin = Teacher(
        teacher_id="ADM001",
        name="Admin User",
        email="admin@test.com",
        password_hash="hash",
        role="ADMIN",
        status="ACTIVE",
        max_lectures_per_day=0
    )
    # Create teacher
    teacher = Teacher(
        teacher_id="TCH001",
        name="Teacher User",
        email="teacher@test.com",
        password_hash="hash",
        role="TEACHER",
        status="ACTIVE",
        max_lectures_per_day=4
    )
    db.add_all([admin, teacher])
    db.commit()

    # Create Class Std 10-A
    school_class = SchoolClass(class_name="10", division="A")
    db.add(school_class)
    db.commit()

    # Create Subjects: Marathi, Maths-1
    sub_marathi = Subject(subject_name="Marathi", code="MAR10")
    sub_maths1 = Subject(subject_name="Maths-1", code="M101")
    db.add_all([sub_marathi, sub_maths1])
    db.commit()

    # Link class to subjects in class_subjects
    school_class.subjects.append(sub_marathi)
    school_class.subjects.append(sub_maths1)
    db.commit()

    # Create ExamType (Unit Test 1)
    exam_type = ExamType(name="Unit Test 1", weightage=20.0)
    db.add(exam_type)
    db.commit()

    # Create Student in Std 10-A
    student = Student(
        roll_no="101",
        name="Student One",
        class_id=school_class.id,
        gender="M"
    )
    db.add(student)
    db.commit()

    # Assign teacher to Std 10-A and both subjects
    tc = TeacherClass(teacher_id=teacher.id, class_id=school_class.id)
    tcs1 = TeacherClassSubject(teacher_id=teacher.id, class_id=school_class.id, subject_id=sub_marathi.id)
    tcs2 = TeacherClassSubject(teacher_id=teacher.id, class_id=school_class.id, subject_id=sub_maths1.id)
    db.add_all([tc, tcs1, tcs2])
    db.commit()

    return {
        "admin": admin,
        "teacher": teacher,
        "class": school_class,
        "sub_marathi": sub_marathi,
        "sub_maths1": sub_maths1,
        "exam_type": exam_type,
        "student": student,
    }


def get_headers(user: Teacher):
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"Authorization": f"Bearer {token}"}


def test_admin_crud_subject_max_marks(client: TestClient, db: Session, test_setup: dict):
    admin = test_setup["admin"]
    sub_marathi = test_setup["sub_marathi"]
    exam_type = test_setup["exam_type"]
    headers = get_headers(admin)

    # 1. Create max marks config: Std 10 + Marathi + Unit Test 1 = 40
    res = client.post(
        "/api/v1/admin/subject-max-marks",
        json={
            "class_name": "10",
            "subject_id": sub_marathi.id,
            "exam_type_id": exam_type.id,
            "max_marks": 40.0
        },
        headers=headers
    )
    assert res.status_code == 201
    data = res.json()
    assert data["max_marks"] == 40.0
    record_id = data["id"]

    # 2. Reject duplicate (409 Conflict)
    res_dup = client.post(
        "/api/v1/admin/subject-max-marks",
        json={
            "class_name": "10",
            "subject_id": sub_marathi.id,
            "exam_type_id": exam_type.id,
            "max_marks": 50.0
        },
        headers=headers
    )
    assert res_dup.status_code == 409

    # 3. List configurations
    res_list = client.get("/api/v1/admin/subject-max-marks?class_name=10", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    assert res_list.json()[0]["subject_name"] == "Marathi"

    # 4. Check missing subjects helper endpoint
    res_missing = client.get(
        f"/api/v1/admin/subject-max-marks/missing?class_name=10&exam_type_id={exam_type.id}",
        headers=headers
    )
    assert res_missing.status_code == 200
    missing = res_missing.json()
    assert len(missing) == 1
    assert missing[0]["subject_name"] == "Maths-1"

    # 5. Update max marks
    res_up = client.put(
        f"/api/v1/admin/subject-max-marks/{record_id}",
        json={"max_marks": 45.0},
        headers=headers
    )
    assert res_up.status_code == 200
    assert res_up.json()["max_marks"] == 45.0

    # 6. Delete config
    res_del = client.delete(f"/api/v1/admin/subject-max-marks/{record_id}", headers=headers)
    assert res_del.status_code == 200


def test_teacher_subjects_by_class_with_max_marks(client: TestClient, db: Session, test_setup: dict):
    teacher = test_setup["teacher"]
    school_class = test_setup["class"]
    sub_marathi = test_setup["sub_marathi"]
    exam_type = test_setup["exam_type"]
    headers = get_headers(teacher)

    # Add max marks for Marathi (40), leave Maths-1 unconfigured
    smm = SubjectMaxMarks(class_name="10", subject_id=sub_marathi.id, exam_type_id=exam_type.id, max_marks=40.0)
    db.add(smm)
    db.commit()

    res = client.get(
        f"/api/v1/teacher/subjects/by-class/{school_class.id}?exam_type_id={exam_type.id}",
        headers=headers
    )
    assert res.status_code == 200
    subjects = res.json()
    assert len(subjects) == 2

    marathi_item = next(s for s in subjects if s["id"] == sub_marathi.id)
    assert marathi_item["max_marks"] == 40.0
    assert marathi_item["needs_config"] is False

    maths_item = next(s for s in subjects if s["id"] == test_setup["sub_maths1"].id)
    assert maths_item["max_marks"] is None
    assert maths_item["needs_config"] is True


def test_teacher_submit_result_validation(client: TestClient, db: Session, test_setup: dict):
    teacher = test_setup["teacher"]
    student = test_setup["student"]
    sub_marathi = test_setup["sub_marathi"]
    sub_maths1 = test_setup["sub_maths1"]
    exam_type = test_setup["exam_type"]
    headers = get_headers(teacher)

    # Configure Marathi max marks = 40.0 (Maths-1 remains unconfigured)
    smm = SubjectMaxMarks(class_name="10", subject_id=sub_marathi.id, exam_type_id=exam_type.id, max_marks=40.0)
    db.add(smm)
    db.commit()

    # 1. Reject submission when subject is unconfigured (Maths-1)
    res_unconfig = client.post(
        "/api/v1/teacher/results/submit",
        json={
            "class_id": test_setup["class"].id,
            "subject_id": sub_maths1.id,
            "exam_type_id": exam_type.id,
            "marks": [{"student_id": student.id, "marks_obtained": 15.0}]
        },
        headers=headers
    )
    assert res_unconfig.status_code == 400
    assert "not configured" in res_unconfig.json()["detail"].lower()

    # 2. Reject submission when marks_obtained > max_marks (45 > 40 for Marathi)
    res_exceed = client.post(
        "/api/v1/teacher/results/submit",
        json={
            "class_id": test_setup["class"].id,
            "subject_id": sub_marathi.id,
            "exam_type_id": exam_type.id,
            "marks": [{"student_id": student.id, "marks_obtained": 45.0}]
        },
        headers=headers
    )
    assert res_exceed.status_code == 400
    assert "cannot exceed" in res_exceed.json()["detail"].lower()

    # 3. Accept valid submission (35 / 40 for Marathi)
    res_valid = client.post(
        "/api/v1/teacher/results/submit",
        json={
            "class_id": test_setup["class"].id,
            "subject_id": sub_marathi.id,
            "exam_type_id": exam_type.id,
            "marks": [{"student_id": student.id, "marks_obtained": 35.0}]
        },
        headers=headers
    )
    assert res_valid.status_code == 200
