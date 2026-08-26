from sqlalchemy.orm import Session, joinedload
from sqlalchemy.future import select
from app.models.result import Result
from app.models.student import Student
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.teacher_class_subject import TeacherClassSubject
from app.schemas.result import ResultCreate, MIN_MARKS, MAX_MARKS
from app.core.exceptions import ResourceNotFoundException, ValidationException, ForbiddenException
from typing import List, Optional
from datetime import datetime

import re

def calculate_grade_and_percentage(marks_obtained: float, total_marks: float) -> tuple[float, str]:
    """Helper function to calculate percentage based on marks."""
    if total_marks <= 0:
        raise ValidationException("Total marks must be greater than 0.")
    if marks_obtained < 0:
        raise ValidationException("Marks obtained cannot be negative.")
    if marks_obtained > total_marks:
        raise ValidationException("Marks obtained cannot exceed total marks.")
        
    percentage = (marks_obtained / total_marks) * 100
    percentage = round(percentage, 2)
    return percentage, ""


def get_grading_scale_group(class_name: str) -> str:
    """Extract standard number from class_name string (e.g., '1', '1 A', 'Std 9', '10 B').
    Returns 'STD_1_8' for Std 1-8, 'STD_9_10' for Std 9-10.
    """
    if not class_name:
        return "STD_1_8"
    match = re.search(r'\b(10|[1-9])\b', class_name)
    if match:
        std_num = int(match.group(1))
        if std_num in (9, 10):
            return "STD_9_10"
    return "STD_1_8"


def calculate_overall_grade(percentage: float, scale_group: str) -> str:
    """Calculate overall student grade based on overall percentage and class scale group.
    
    Std 1-8 (8-tier scale):
    P >= 91 -> 'A 1'
    P >= 81 -> 'A 2'
    P >= 71 -> 'ba 1'
    P >= 61 -> 'ba 2'
    P >= 51 -> 'k  1' (two spaces)
    P >= 41 -> 'k  2' (two spaces)
    P <= 40 -> 'D'
    P <= 20 -> '[ 1' (unreachable per official Excel formula ordering, preserved per spec)
    
    Std 9-10 (5-tier scale):
    P >= 75 -> 'A ' (trailing space)
    P >= 60 -> 'ba'
    P >= 49 -> 'k'
    P >= 35 -> 'D'
    P < 35  -> '['
    """
    if scale_group == "STD_9_10":
        if percentage >= 75:
            return "A "
        elif percentage >= 60:
            return "ba"
        elif percentage >= 49:
            return "k"
        elif percentage >= 35:
            return "D"
        else:
            return "["
    else:  # STD_1_8
        if percentage >= 91:
            return "A 1"
        elif percentage >= 81:
            return "A 2"
        elif percentage >= 71:
            return "ba 1"
        elif percentage >= 61:
            return "ba 2"
        elif percentage >= 51:
            return "k  1"
        elif percentage >= 41:
            return "k  2"
        elif percentage <= 40:
            return "D"
        elif percentage <= 20:
            return "[ 1"
        else:
            return "D"


def calculate_class_overall_results(db: Session, class_id: int, exam_type_id: int) -> dict:
    """Compute overall totals, percentage, grade, and rank for every student in a class for a given exam type.
    
    Returns a dictionary mapping student_id to:
    {
        "total_obtained": float,
        "total_max": float,
        "percentage": float,
        "grade": str,
        "rank": int | None
    }
    """
    school_class = db.scalars(select(SchoolClass).where(SchoolClass.id == class_id)).first()
    class_name = school_class.class_name if school_class else ""
    scale_group = get_grading_scale_group(class_name)

    students = db.scalars(
        select(Student)
        .where(Student.class_id == class_id)
        .order_by(Student.roll_no, Student.id)
    ).all()

    if not students:
        return {}

    student_ids = [s.id for s in students]

    results = db.scalars(
        select(Result)
        .where(
            Result.student_id.in_(student_ids),
            Result.exam_type_id == exam_type_id
        )
    ).all()

    student_results = {}
    for r in results:
        student_results.setdefault(r.student_id, []).append(r)

    overall_summary = {}
    for student in students:
        res_list = student_results.get(student.id, [])
        if not res_list:
            overall_summary[student.id] = {
                "total_obtained": 0.0,
                "total_max": 0.0,
                "percentage": 0.0,
                "grade": calculate_overall_grade(0.0, scale_group),
                "rank": None,
                "has_results": False
            }
            continue

        tot_obtained = sum(float(r.marks_obtained) for r in res_list)
        tot_max = sum(float(r.total_marks) for r in res_list)
        pct = round((tot_obtained * 100.0) / tot_max, 2) if tot_max > 0 else 0.0
        grd = calculate_overall_grade(pct, scale_group)

        overall_summary[student.id] = {
            "total_obtained": round(tot_obtained, 2),
            "total_max": round(tot_max, 2),
            "percentage": pct,
            "grade": grd,
            "rank": None,
            "has_results": True
        }

    ranked_students = [
        (s_id, data["total_obtained"])
        for s_id, data in overall_summary.items()
        if data["has_results"]
    ]
    ranked_students.sort(key=lambda x: x[1], reverse=True)

    current_rank = 1
    for i, (s_id, score) in enumerate(ranked_students):
        if i > 0 and score < ranked_students[i - 1][1]:
            current_rank = i + 1
        overall_summary[s_id]["rank"] = current_rank

    return overall_summary



def _check_teacher_authorized(
    db: Session,
    results_data: List[ResultCreate],
    student_ids: set,
    teacher_id: int,
) -> None:
    """Raise ForbiddenException unless the teacher teaches every (class, subject)
    referenced by the batch. Authority comes from the explicit
    teacher_class_subjects mapping."""
    authorized_pairs = set(
        db.execute(
            select(TeacherClassSubject.class_id, TeacherClassSubject.subject_id).where(
                TeacherClassSubject.teacher_id == teacher_id
            )
        ).all()
    )

    student_class_map = dict(
        db.execute(
            select(Student.id, Student.class_id).where(Student.id.in_(student_ids))
        ).all()
    )

    unauthorized = []
    for data in results_data:
        student_class_id = student_class_map.get(data.student_id)
        if (student_class_id, data.subject_id) not in authorized_pairs:
            unauthorized.append((data.student_id, data.subject_id))
    if unauthorized:
        raise ForbiddenException(
            "You are not assigned to teach one or more of the requested "
            f"student/subject pairs: {unauthorized}. You may only enter marks "
            "for subjects you teach in your own classes."
        )


def create_result_batch(
    db: Session,
    results_data: List[ResultCreate],
    teacher_id: int,
    is_admin: bool = False
) -> List[Result]:
    """Create or update a batch of student results and set status to 'submitted'.

    When called by a teacher (is_admin=False) the teacher is only allowed to
    record results for subjects they actually teach in the student's class, and
    cannot overwrite results an admin has already approved. Admins bypass both
    checks (they can enter marks for any student/subject)."""
    if not results_data:
        return []

    # 1. Bulk validate existence of Students, Subjects, and ExamTypes
    student_ids = {data.student_id for data in results_data}
    subject_ids = {data.subject_id for data in results_data}
    exam_type_ids = {data.exam_type_id for data in results_data}

    found_student_ids = set(db.scalars(select(Student.id).where(Student.id.in_(student_ids))).all())
    missing_students = student_ids - found_student_ids
    if missing_students:
        raise ResourceNotFoundException("Student", str(next(iter(missing_students))))

    found_subject_ids = set(db.scalars(select(Subject.id).where(Subject.id.in_(subject_ids))).all())
    missing_subjects = subject_ids - found_subject_ids
    if missing_subjects:
        raise ResourceNotFoundException("Subject", str(next(iter(missing_subjects))))

    found_exam_type_ids = set(db.scalars(select(ExamType.id).where(ExamType.id.in_(exam_type_ids))).all())
    missing_exam_types = exam_type_ids - found_exam_type_ids
    if missing_exam_types:
        raise ResourceNotFoundException("ExamType", str(next(iter(missing_exam_types))))

    # 1b. Authorization: the submitting teacher may only record results for
    # students in classes where they actually teach the subject. Authority comes
    # from the explicit teacher_class_subjects mapping. Without this, any teacher
    # could edit any student's marks."""
    if not is_admin:
        _check_teacher_authorized(db, results_data, student_ids, teacher_id)

    # 2. Bulk fetch existing results matching the batch criteria
    existing_results = db.scalars(
        select(Result).where(
            Result.student_id.in_(student_ids),
            Result.subject_id.in_(subject_ids),
            Result.exam_type_id.in_(exam_type_ids)
        )
    ).all()
    existing_map = {(r.student_id, r.subject_id, r.exam_type_id): r for r in existing_results}

    # 3. Create or update result records in memory
    results = []
    now = datetime.utcnow()
    for data in results_data:
        percentage, grade = calculate_grade_and_percentage(data.marks_obtained, data.total_marks)
        key = (data.student_id, data.subject_id, data.exam_type_id)
        existing = existing_map.get(key)
        
        if existing:
            if not is_admin and existing.status == "approved":
                raise ForbiddenException(
                    "Cannot overwrite an already approved result (student "
                    f"{data.student_id}, subject {data.subject_id}). Contact the "
                    "administrator to amend it."
                )
            existing.marks_obtained = data.marks_obtained
            existing.total_marks = data.total_marks
            existing.percentage = percentage
            existing.grade = grade
            existing.status = "submitted"
            existing.submitted_by_id = teacher_id
            existing.submitted_at = now
            results.append(existing)
        else:
            db_result = Result(
                student_id=data.student_id,
                subject_id=data.subject_id,
                exam_type_id=data.exam_type_id,
                marks_obtained=data.marks_obtained,
                total_marks=data.total_marks,
                percentage=percentage,
                grade=grade,
                status="submitted",
                submitted_by_id=teacher_id,
                submitted_at=now
            )
            db.add(db_result)
            results.append(db_result)

    db.commit()

    # 4. Fetch all refreshed results with joined relationships in a single bulk query
    result_ids = [r.id for r in results]
    final_results = db.scalars(
        select(Result).options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type)
        ).where(Result.id.in_(result_ids))
    ).unique().all()

    return list(final_results)

def get_results_by_status(db: Session, status: Optional[str] = None) -> List[Result]:
    """Retrieve all results filtered by status, including nested relationships."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    )
    if status:
        stmt = stmt.where(Result.status == status)
        
    result = db.execute(stmt)
    return list(result.scalars().all())

def approve_result(db: Session, result_id: int, admin_id: int, approved: bool) -> Result:
    """Approve or reject a submitted result."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    ).where(Result.id == result_id)
    
    db_result = db.execute(stmt).scalar_one_or_none()
    if not db_result:
        raise ResourceNotFoundException("Result", str(result_id))
        
    if approved:
        db_result.status = "approved"
    else:
        db_result.status = "rejected"
        
    db_result.approved_by_id = admin_id
    db_result.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(db_result)
    return db_result

def update_result(db: Session, result_id: int, data: dict) -> Result:
    """Update an existing result (admin override)."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    ).where(Result.id == result_id)
    
    db_result = db.execute(stmt).scalar_one_or_none()
    if not db_result:
        raise ResourceNotFoundException("Result", str(result_id))
    
    # Update fields
    if 'marks_obtained' in data:
        db_result.marks_obtained = data['marks_obtained']
        percentage, grade = calculate_grade_and_percentage(
            db_result.marks_obtained, 
            db_result.total_marks
        )
        db_result.percentage = percentage
        db_result.grade = grade
    
    if 'total_marks' in data:
        db_result.total_marks = data['total_marks']
        percentage, grade = calculate_grade_and_percentage(
            db_result.marks_obtained, 
            db_result.total_marks
        )
        db_result.percentage = percentage
        db_result.grade = grade
    
    if 'status' in data:
        db_result.status = data['status']
    
    db.commit()
    db.refresh(db_result)
    return db_result