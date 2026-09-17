from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.student import Student
from app.models.teacher_class_subject import TeacherClassSubject
from app.core.class_sorter import sort_classes_natural


async def _get_teacher_classes(db: AsyncSession, teacher_id: int) -> list:
    """Classes a teacher teaches, grouped from the authoritative class-subject mapping."""
    stmt = (
        select(TeacherClassSubject, SchoolClass, Subject)
        .join(SchoolClass, TeacherClassSubject.class_id == SchoolClass.id)
        .join(Subject, TeacherClassSubject.subject_id == Subject.id)
        .where(TeacherClassSubject.teacher_id == teacher_id)
    )
    result = await db.execute(stmt)
    rows = result.all()

    grouped = {}
    for _tcs, school_class, subject in rows:
        key = school_class.id
        if key not in grouped:
            grouped[key] = {
                "class_name": school_class.class_name,
                "division": school_class.division,
                "subjects": [],
            }
        grouped[key]["subjects"].append(
            {"subject_name": subject.subject_name, "code": subject.code}
        )

    return sort_classes_natural(list(grouped.values()))


async def _get_admin_stats(db: AsyncSession) -> Dict[str, int]:
    """Lightweight school headcounts for the admin dashboard hero."""
    teachers_count = (await db.execute(select(func.count(Teacher.id)))).scalar() or 0
    classes_count = (await db.execute(select(func.count(SchoolClass.id)))).scalar() or 0
    students_count = (await db.execute(select(func.count(Student.id)))).scalar() or 0

    return {
        "teachers_count": teachers_count,
        "classes_count": classes_count,
        "students_count": students_count,
    }


async def build_me_response(db: AsyncSession, teacher: Teacher) -> Dict:
    """Build the /auth/me payload including role-specific computed fields asynchronously."""
    payload = {
        "id": teacher.id,
        "teacher_id": teacher.teacher_id,
        "name": teacher.name,
        "email": teacher.email,
        "role": teacher.role,
        "status": teacher.status,
        "classes_teaching": None,
        "stats": None,
    }

    if teacher.role == "TEACHER":
        payload["classes_teaching"] = await _get_teacher_classes(db, teacher.id)
    elif teacher.role == "ADMIN":
        payload["stats"] = await _get_admin_stats(db)

    return payload
