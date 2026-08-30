from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher_class import TeacherClass
from app.models.teacher_class_subject import TeacherClassSubject

router = APIRouter(prefix="/teacher/students", tags=["Teacher - Students"])

@router.get("/by-class/{class_id}")
def get_students_by_class(
    class_id: int,
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Load the class & verify assignment in TeacherClass
    school_class = db.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Class not found")

    is_assigned = db.execute(
        select(TeacherClass.id).where(
            TeacherClass.teacher_id == current_user.id,
            TeacherClass.class_id == class_id
        ).limit(1)
    ).scalar_one_or_none()

    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this class."
        )

    # 2. Students in this class
    stmt = select(Student).where(Student.class_id == class_id).order_by(Student.roll_no)
    students = db.execute(stmt).scalars().all()

    # 3. Subjects taught by THIS teacher in THIS class according to teacher_class_subjects
    subject_ids = db.scalars(
        select(TeacherClassSubject.subject_id).where(
            TeacherClassSubject.teacher_id == current_user.id,
            TeacherClassSubject.class_id == class_id
        )
    ).all()

    subjects_result = []
    if subject_ids:
        subjects_result = db.scalars(
            select(Subject)
            .where(Subject.id.in_(subject_ids))
            .order_by(Subject.subject_name)
        ).all()

    return {
        "students": [
            {
                "id": s.id,
                "roll_no": s.roll_no,
                "name": s.name,
                "class_id": s.class_id,
            }
            for s in students
        ],
        "subjects": [
            {"id": subj.id, "subject_name": subj.subject_name, "code": subj.code}
            for subj in subjects_result
        ]
    }

