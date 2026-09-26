import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.api.admin_classes import router as admin_classes_router


def _make_app(db: AsyncSession, user: Teacher) -> FastAPI:
    """Build a minimal app with only the classes router, auth overridden."""
    app = FastAPI()
    app.include_router(admin_classes_router)

    async def _get_db_override():
        yield db

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = lambda: user
    return app


def _client(db: AsyncSession, user: Teacher) -> TestClient:
    return TestClient(_make_app(db, user), raise_server_exceptions=False)


@pytest.mark.asyncio
async def test_assign_class_teacher_success(db: AsyncSession):
    """Case 1: assigning an ACTIVE teacher sets class_teacher_id, clears nothing."""
    admin = Teacher(
        teacher_id="T001",
        name="Admin",
        email="admin@school.edu",
        password_hash="pass",
        role="ADMIN",
        status="ACTIVE",
    )
    teacher = Teacher(
        teacher_id="T100",
        name="Active Teacher",
        email="t100@school.edu",
        password_hash="pass",
        role="TEACHER",
        status="ACTIVE",
    )
    klass = SchoolClass(class_name="5", division="A")
    db.add_all([admin, teacher, klass])
    await db.commit()
    await db.refresh(teacher)
    await db.refresh(klass)

    client = _client(db, admin)
    res = client.put(
        f"/admin/classes/{klass.id}/class-teacher",
        json={"teacher_id": teacher.id},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["class_id"] == klass.id
    assert body["class_teacher_id"] == teacher.id
    assert body["cleared_classes"] == []

    await db.refresh(klass)
    assert klass.class_teacher_id == teacher.id


@pytest.mark.asyncio
async def test_assign_same_teacher_to_second_class_clears_first(db: AsyncSession):
    """Case 2: re-assigning a teacher to another class nulls the previous class."""
    admin = Teacher(
        teacher_id="T001",
        name="Admin",
        email="admin@school.edu",
        password_hash="pass",
        role="ADMIN",
        status="ACTIVE",
    )
    teacher = Teacher(
        teacher_id="T100",
        name="Active Teacher",
        email="t100@school.edu",
        password_hash="pass",
        role="TEACHER",
        status="ACTIVE",
    )
    klass1 = SchoolClass(class_name="5", division="A")
    klass2 = SchoolClass(class_name="5", division="B")
    db.add_all([admin, teacher, klass1, klass2])
    await db.commit()
    await db.refresh(teacher)
    await db.refresh(klass1)
    await db.refresh(klass2)

    client = _client(db, admin)

    # Assign to class 1 first
    res1 = client.put(
        f"/admin/classes/{klass1.id}/class-teacher",
        json={"teacher_id": teacher.id},
    )
    assert res1.status_code == 200, res1.text
    assert res1.json()["cleared_classes"] == []

    # Now assign the same teacher to class 2 — class 1 should be cleared
    res2 = client.put(
        f"/admin/classes/{klass2.id}/class-teacher",
        json={"teacher_id": teacher.id},
    )
    assert res2.status_code == 200, res2.text
    body = res2.json()
    assert body["class_id"] == klass2.id
    assert body["class_teacher_id"] == teacher.id
    assert len(body["cleared_classes"]) == 1
    cleared = body["cleared_classes"][0]
    assert cleared["id"] == klass1.id
    assert cleared["class_name"] == klass1.class_name
    assert cleared["division"] == klass1.division

    # Follow-up GET /admin/classes/ should show class 1 has class_teacher_id null
    res3 = client.get("/admin/classes/")
    assert res3.status_code == 200, res3.text
    rows = {c["id"]: c for c in res3.json()}
    assert rows[klass1.id]["class_teacher_id"] is None
    assert rows[klass2.id]["class_teacher_id"] == teacher.id


@pytest.mark.asyncio
async def test_clear_class_teacher_with_null(db: AsyncSession):
    """Case 3: PUT with teacher_id=null clears the class teacher."""
    admin = Teacher(
        teacher_id="T001",
        name="Admin",
        email="admin@school.edu",
        password_hash="pass",
        role="ADMIN",
        status="ACTIVE",
    )
    teacher = Teacher(
        teacher_id="T100",
        name="Active Teacher",
        email="t100@school.edu",
        password_hash="pass",
        role="TEACHER",
        status="ACTIVE",
    )
    klass = SchoolClass(class_name="5", division="A", class_teacher_id=teacher.id)
    db.add_all([admin, teacher, klass])
    await db.commit()
    await db.refresh(klass)

    client = _client(db, admin)
    res = client.put(
        f"/admin/classes/{klass.id}/class-teacher",
        json={"teacher_id": None},
    )
    assert res.status_code == 200, res.text
    assert res.json()["class_teacher_id"] is None
    assert res.json()["cleared_classes"] == []

    await db.refresh(klass)
    assert klass.class_teacher_id is None


@pytest.mark.asyncio
async def test_assign_nonexistent_teacher_returns_404(db: AsyncSession):
    """Case 4: PUT with a teacher id that does not exist returns 404."""
    admin = Teacher(
        teacher_id="T001",
        name="Admin",
        email="admin@school.edu",
        password_hash="pass",
        role="ADMIN",
        status="ACTIVE",
    )
    klass = SchoolClass(class_name="5", division="A")
    db.add_all([admin, klass])
    await db.commit()
    await db.refresh(klass)

    client = _client(db, admin)
    res = client.put(
        f"/admin/classes/{klass.id}/class-teacher",
        json={"teacher_id": 99999},
    )
    assert res.status_code == 404, res.text


@pytest.mark.asyncio
async def test_assign_pending_teacher_returns_400(db: AsyncSession):
    """Case 5: a PENDING teacher is rejected. ValidationException maps to 400."""
    admin = Teacher(
        teacher_id="T001",
        name="Admin",
        email="admin@school.edu",
        password_hash="pass",
        role="ADMIN",
        status="ACTIVE",
    )
    pending = Teacher(
        teacher_id="T200",
        name="Pending Teacher",
        email="t200@school.edu",
        password_hash="pass",
        role="TEACHER",
        status="PENDING",
    )
    klass = SchoolClass(class_name="5", division="A")
    db.add_all([admin, pending, klass])
    await db.commit()
    await db.refresh(pending)
    await db.refresh(klass)

    client = _client(db, admin)
    res = client.put(
        f"/admin/classes/{klass.id}/class-teacher",
        json={"teacher_id": pending.id},
    )
    assert res.status_code == 400, res.text
    detail = res.json()["detail"]
    # ValidationException wraps detail as {"message": ...}
    assert "message" in detail
    assert "not ACTIVE" in detail["message"]

    # The class teacher must remain unset
    await db.refresh(klass)
    assert klass.class_teacher_id is None


@pytest.mark.asyncio
async def test_non_admin_cannot_assign_class_teacher(db: AsyncSession):
    """Case 6: a TEACHER-role caller receives 403 from require_admin."""
    teacher = Teacher(
        teacher_id="T100",
        name="Regular Teacher",
        email="t100@school.edu",
        password_hash="pass",
        role="TEACHER",
        status="ACTIVE",
    )
    klass = SchoolClass(class_name="5", division="A")
    db.add_all([teacher, klass])
    await db.commit()
    await db.refresh(teacher)
    await db.refresh(klass)

    client = _client(db, teacher)
    res = client.put(
        f"/admin/classes/{klass.id}/class-teacher",
        json={"teacher_id": teacher.id},
    )
    assert res.status_code == 403, res.text
    assert res.json()["detail"] == "Admin access required"
