import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.teacher_class import TeacherClass
from app.models.teacher_class_subject import TeacherClassSubject
from app.api.teacher_classes import router as teacher_classes_router
from app.api.teacher_subject_list import router as teacher_subjects_router


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    engine.dispose()


def test_teacher_classes_and_subjects_without_timetable(db):
    teacher1 = Teacher(
        teacher_id="T100",
        name="Assigned Teacher",
        email="teacher1@school.edu",
        password_hash="pass",
        role="TEACHER",
        status="ACTIVE",
    )
    teacher2 = Teacher(
        teacher_id="T200",
        name="Unassigned Teacher",
        email="teacher2@school.edu",
        password_hash="pass",
        role="TEACHER",
        status="ACTIVE",
    )
    db.add_all([teacher1, teacher2])

    klass1 = SchoolClass(class_name="5", division="A")
    klass2 = SchoolClass(class_name="5", division="B")
    db.add_all([klass1, klass2])

    s1 = Subject(subject_name="Mathematics", code="MATH")
    s2 = Subject(subject_name="Science", code="SCI")
    db.add_all([s1, s2])
    db.commit()

    db.refresh(teacher1)
    db.refresh(teacher2)
    db.refresh(klass1)
    db.refresh(klass2)
    db.refresh(s1)
    db.refresh(s2)

    # Teacher 1 assigned to Class 1 and Class 2, but only has subjects mapped for Class 1
    db.add(TeacherClass(teacher_id=teacher1.id, class_id=klass1.id))
    db.add(TeacherClass(teacher_id=teacher1.id, class_id=klass2.id))
    db.add(TeacherClassSubject(teacher_id=teacher1.id, class_id=klass1.id, subject_id=s1.id))
    db.add(TeacherClassSubject(teacher_id=teacher1.id, class_id=klass1.id, subject_id=s2.id))
    db.commit()

    app = FastAPI()
    app.include_router(teacher_classes_router)
    app.include_router(teacher_subjects_router)

    def get_client(user):
        def _get_db_override():
            yield db
        app.dependency_overrides[get_db] = _get_db_override
        app.dependency_overrides[get_current_user] = lambda: user
        return TestClient(app)

    # 1. GET /teacher/classes should return Class 1 and Class 2 for Teacher 1
    client1 = get_client(teacher1)
    res1 = client1.get("/teacher/classes")
    assert res1.status_code == 200, res1.text
    classes = res1.json()
    assert len(classes) == 2
    class_ids = {c["id"] for c in classes}
    assert klass1.id in class_ids
    assert klass2.id in class_ids

    # 2. GET /teacher/classes should return [] for Teacher 2 (no assignments)
    client2 = get_client(teacher2)
    res2 = client2.get("/teacher/classes")
    assert res2.status_code == 200
    assert res2.json() == []

    # 3. GET /teacher/subjects/by-class/{class_id} for Teacher 1 in Class 1 -> returns Math & Science
    client1 = get_client(teacher1)
    res3 = client1.get(f"/teacher/subjects/by-class/{klass1.id}")
    assert res3.status_code == 200
    subjects = res3.json()
    assert len(subjects) == 2
    subj_names = {s["subject_name"] for s in subjects}
    assert "Mathematics" in subj_names
    assert "Science" in subj_names

    # 4. GET /teacher/subjects/by-class/{class_id} for Teacher 1 in Class 2 -> returns [] (assigned class, no subjects)
    client1 = get_client(teacher1)
    res4 = client1.get(f"/teacher/subjects/by-class/{klass2.id}")
    assert res4.status_code == 200
    assert res4.json() == []

    # 5. GET /teacher/subjects/by-class/{class_id} for Teacher 2 in Class 1 -> 403 Forbidden
    client2 = get_client(teacher2)
    res5 = client2.get(f"/teacher/subjects/by-class/{klass1.id}")
    assert res5.status_code == 403
    assert res5.json()["detail"] == "You are not assigned to this class."
