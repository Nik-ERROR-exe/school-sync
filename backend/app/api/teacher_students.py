from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.timetable import TimetableSlot

router = APIRouter(prefix="/teacher/students", tags=["Teacher - Students"])

@router.get("/by-class/{class_id}")
def get_students_by_class(
    class_id: int,
    current_user: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Load the class
    school_class = db.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Class not found")

    # 2. Students in this class
    stmt = select(Student).where(Student.class_id == class_id).order_by(Student.roll_no)
    students = db.execute(stmt).scalars().all()

    # 3. Subjects taught by THIS teacher in THIS class according to the timetable
    timetable_subject_ids_result = db.execute(
        select(TimetableSlot.subject_id)
        .where(
            TimetableSlot.teacher_id == current_user.id,
            TimetableSlot.class_id == class_id,
            TimetableSlot.subject_id > 0  # exclude free periods (subject_id = 0)
        )
        .distinct()
    ).scalars().all()

    timetable_subject_ids = set(timetable_subject_ids_result)

    if not timetable_subject_ids:
        # No timetable slots for this teacher in this class
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
            "subjects": [],
            "message": "No timetable assignments found for this class. Generate and save the timetable first."
        }

    # Load subject details for the filtered IDs
    subjects_result = db.execute(
        select(Subject)
        .where(Subject.id.in_(timetable_subject_ids))
        .order_by(Subject.subject_name)
    ).scalars().all()

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