from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.future import select
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.timetable import TimetableSlot
from app.models.subject import Subject
from app.models.student import Student

router = APIRouter(prefix="/teacher/classes", tags=["Teacher - Classes"])

@router.get("")
@router.get("/")
@router.get("/my-classes")
def get_my_classes(
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_teacher_id = current_user.id
    
    stmt = select(TimetableSlot.class_id).where(
        TimetableSlot.teacher_id == current_teacher_id
    ).distinct()
    class_ids = [row[0] for row in db.execute(stmt).all()]
    
    if not class_ids:
        return []
    
    classes = db.execute(
        select(SchoolClass)
        .options(joinedload(SchoolClass.subjects))
        .where(SchoolClass.id.in_(class_ids))
        .order_by(SchoolClass.class_name, SchoolClass.division)
    ).scalars().unique().all()
    
    return [{"id": c.id, "class_name": c.class_name, "division": c.division} for c in classes]


@router.get("/students/by-class/{class_id}")
def get_students_by_class(
    class_id: int,
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify this teacher teaches in this class (from timetable)
    teaches_here = db.execute(
        select(TimetableSlot.id).where(
            TimetableSlot.teacher_id == current_user.id,
            TimetableSlot.class_id == class_id
        ).limit(1)
    ).scalar_one_or_none()

    if not teaches_here:
        return {
            "students": [],
            "subjects": [],
            "message": "You are not assigned to this class in the timetable."
        }

    # 2. Get students in this class
    students = db.execute(
        select(Student)
        .where(Student.class_id == class_id)
        .order_by(Student.roll_no)
    ).scalars().all()

    # 3. Get subjects this teacher teaches in this class (from timetable)
    subject_ids = db.execute(
        select(TimetableSlot.subject_id)
        .where(
            TimetableSlot.teacher_id == current_user.id,
            TimetableSlot.class_id == class_id,
            TimetableSlot.subject_id > 0
        )
        .distinct()
    ).scalars().all()

    subjects = db.execute(
        select(Subject)
        .where(Subject.id.in_(subject_ids))
        .order_by(Subject.subject_name)
    ).scalars().all()

    return {
        "students": [
            {
                "id": s.id,
                "roll_no": s.roll_no,
                "name": s.name,
                "class_id": s.class_id
            }
            for s in students
        ],
        "subjects": [
            {
                "id": s.id,
                "subject_name": s.subject_name,
                "code": s.code
            }
            for s in subjects
        ]
    }