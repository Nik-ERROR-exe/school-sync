from typing import Dict

from sqlalchemy.orm import Session

from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.student import Student
from app.models.teacher_class_subject import TeacherClassSubject


def _get_teacher_classes(db: Session, teacher_id: int) -> list:
    """Classes a teacher teaches, grouped from the authoritative class-subject mapping."""
    rows = (
        db.query(TeacherClassSubject, SchoolClass, Subject)
        .join(SchoolClass, TeacherClassSubject.class_id == SchoolClass.id)
        .join(Subject, TeacherClassSubject.subject_id == Subject.id)
        .filter(TeacherClassSubject.teacher_id == teacher_id)
        .order_by(SchoolClass.class_name, SchoolClass.division, Subject.subject_name)
        .all()
    )

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

    return list(grouped.values())


def _get_admin_stats(db: Session) -> Dict[str, int]:
    """Lightweight school headcounts for the admin dashboard hero."""
    return {
        "teachers_count": db.query(Teacher).count(),
        "classes_count": db.query(SchoolClass).count(),
        "students_count": db.query(Student).count(),
    }


def build_me_response(db: Session, teacher: Teacher) -> Dict:
    """Build the /auth/me payload including role-specific computed fields."""
    payload = {
        "id": teacher.id,
        "teacher_id": teacher.teacher_id,
        "name": teacher.name,
        "email": teacher.email,
        "role": teacher.role,
        "status": teacher.status,
        "profile_image_url": teacher.profile_image_url,
        "classes_teaching": None,
        "stats": None,
    }

    if teacher.role == "TEACHER":
        payload["classes_teaching"] = _get_teacher_classes(db, teacher.id)
    elif teacher.role == "ADMIN":
        payload["stats"] = _get_admin_stats(db)

    return payload
