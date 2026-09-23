from sqlalchemy import cast, Integer
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.result import Result
from app.models.student import Student
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.subject_max_marks import SubjectMaxMarks
from app.schemas.result import ResultCreate

from app.core.exceptions import ResourceNotFoundException, ValidationException, ForbiddenException
from typing import List, Optional
from datetime import datetime

import re

def calculate_grade_and_percentage(marks_obtained: float, total_marks: float) -> tuple[float, str]:
    if total_marks <= 0:
        raise ValidationException("Total marks must be greater than 0.")
    if marks_obtained < 0:
        raise ValidationException("Marks obtained cannot be negative.")
    if marks_obtained > total_marks:
        raise ValidationException("Marks obtained cannot exceed total marks.")
    percentage = (marks_obtained / total_marks) * 100
    percentage = round(percentage, 2)
    p = round(percentage, 2)
    if p >= 91:
        grade = "A1"
    elif p >= 81:
        grade = "A2"
    elif p >= 71:
        grade = "B1"
    elif p >= 61:
        grade = "B2"
    elif p >= 51:
        grade = "C1"
    elif p >= 41:
        grade = "C2"
    else:
        grade = "D"
    return percentage, grade


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
    p = round(percentage, 2)
    # Unified school scale: A1 >= 91, A2 >= 81, B1 >= 71, B2 >= 61,
    # C1 >= 51, C2 >= 41, else D. Scale applies to all classes uniformly.
    if p >= 91:
        return "A1"
    elif p >= 81:
        return "A2"
    elif p >= 71:
        return "B1"
    elif p >= 61:
        return "B2"
    elif p >= 51:
        return "C1"
    elif p >= 41:
        return "C2"
    else:
        return "D"


async def calculate_class_overall_results(db: AsyncSession, class_id: int, exam_type_id: int) -> dict:
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
    school_class = (await db.scalars(select(SchoolClass).where(SchoolClass.id == class_id))).first()
    class_name = school_class.class_name if school_class else ""
    scale_group = get_grading_scale_group(class_name)

    students = (await db.scalars(
        select(Student)
        .where(Student.class_id == class_id)
        .order_by(cast(Student.roll_no, Integer), Student.id)
    )).all()

    if not students:
        return {}

    student_ids = [s.id for s in students]

    results = (await db.scalars(
        select(Result)
        .where(
            Result.student_id.in_(student_ids),
            Result.exam_type_id == exam_type_id
        )
    )).all()

    student_results = {}
    for r in results:
        student_results.setdefault(r.student_id, []).append(r)

    # Add result_status: P (Pass) if no subject total < 35% of its max; else F (Fail)
    result_status = "P"
    for student in students:
        res_list = student_results.get(student.id, [])
        if res_list:
            for r in res_list:
                if float(r.marks_obtained) < 0.35 * float(r.total_marks):
                    result_status = "F"
                    break
        else:
            result_status = "F"

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
                "has_results": False,
                "result_status": "F"
            }
            continue

        tot_obtained = sum(float(r.marks_obtained) for r in res_list)
        tot_max = sum(float(r.total_marks) for r in res_list)
        pct = round((tot_obtained * 100.0) / tot_max, 2) if tot_max > 0 else 0.0
        grd = calculate_overall_grade(pct, scale_group)

        # Compute per-subject pass/fail for this student on this exam
        student_result_status = "P"
        for r in res_list:
            if float(r.marks_obtained) < 0.35 * float(r.total_marks):
                student_result_status = "F"
                break

        overall_summary[student.id] = {
            "total_obtained": round(tot_obtained, 2),
            "total_max": round(tot_max, 2),
            "percentage": pct,
            "grade": grd,
            "rank": None,
            "has_results": True,
            "result_status": student_result_status
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


async def _check_teacher_authorized(
    db: AsyncSession,
    results_data: List[ResultCreate],
    student_ids: set,
    teacher_id: int,
) -> None:
    """Raise ForbiddenException unless the teacher teaches every (class, subject)
    referenced by the batch. Authority comes from the explicit
    teacher_class_subjects mapping."""
    authorized_pairs = set(
        (await db.execute(
            select(TeacherClassSubject.class_id, TeacherClassSubject.subject_id).where(
                TeacherClassSubject.teacher_id == teacher_id
            )
        )).all()
    )

    student_class_map = dict(
        (await db.execute(
            select(Student.id, Student.class_id).where(Student.id.in_(student_ids))
        )).all()
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


async def create_result_batch(
    db: AsyncSession,
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

    found_student_ids = set((await db.scalars(select(Student.id).where(Student.id.in_(student_ids)))).all())
    missing_students = student_ids - found_student_ids
    if missing_students:
        raise ResourceNotFoundException("Student", str(next(iter(missing_students))))

    found_subject_ids = set((await db.scalars(select(Subject.id).where(Subject.id.in_(subject_ids)))).all())
    missing_subjects = subject_ids - found_subject_ids
    if missing_subjects:
        raise ResourceNotFoundException("Subject", str(next(iter(missing_subjects))))

    found_exam_type_ids = set((await db.scalars(select(ExamType.id).where(ExamType.id.in_(exam_type_ids)))).all())
    missing_exam_types = exam_type_ids - found_exam_type_ids
    if missing_exam_types:
        raise ResourceNotFoundException("ExamType", str(next(iter(missing_exam_types))))

    # 1b. Authorization check
    if not is_admin:
        await _check_teacher_authorized(db, results_data, student_ids, teacher_id)

    # 1c. Fetch students with school_class to determine class_name for max_marks lookup
    students = (await db.scalars(
        select(Student)
        .options(joinedload(Student.school_class))
        .where(Student.id.in_(student_ids))
    )).all()
    student_class_name_map = {
        s.id: s.school_class.class_name for s in students if s.school_class
    }

    required_configs = set()
    for data in results_data:
        c_name = student_class_name_map.get(data.student_id)
        if c_name:
            required_configs.add((c_name, data.subject_id, data.exam_type_id))

    class_names = {c[0] for c in required_configs}
    max_marks_records = (await db.scalars(
        select(SubjectMaxMarks).where(
            SubjectMaxMarks.class_name.in_(class_names),
            SubjectMaxMarks.subject_id.in_(subject_ids),
            SubjectMaxMarks.exam_type_id.in_(exam_type_ids)
        )
    )).all() if class_names else []

    # Component-level max lookup (akarikh + oral + written = total max)
    component_lookup = {}
    for r in max_marks_records:
        component_lookup[(r.class_name, r.subject_id, r.exam_type_id)] = {
            "akarikh_max": float(r.akarikh_max),
            "oral_max": float(r.oral_max),
            "written_max": float(r.written_max),
            "total_max": float(r.akarikh_max) + float(r.oral_max) + float(r.written_max),
        }

    # 2. Bulk fetch existing results matching the batch criteria
    existing_results = (await db.scalars(
        select(Result).where(
            Result.student_id.in_(student_ids),
            Result.subject_id.in_(subject_ids),
            Result.exam_type_id.in_(exam_type_ids)
        )
    )).all()
    existing_map = {(r.student_id, r.subject_id, r.exam_type_id): r for r in existing_results}

    # 3. Create or update result records in memory
    results = []
    now = datetime.utcnow()
    for data in results_data:
        c_name = student_class_name_map.get(data.student_id)
        config_key = (c_name, data.subject_id, data.exam_type_id)

        component_config = component_lookup.get(config_key)
        if component_config is None:
            raise ValidationException(
                f"Subject (ID {data.subject_id}) component max marks is not configured for Standard '{c_name}' and exam type (ID {data.exam_type_id}). Contact administrator."
            )

        # Component-level validation
        if data.akarikh_marks < 0 or data.akarikh_marks > component_config["akarikh_max"]:
            raise ValidationException(
                f"akarikh_marks ({data.akarikh_marks}) exceeds configured akarikh_max ({component_config['akarikh_max']}) for subject ID {data.subject_id}."
            )
        if data.oral_marks < 0 or data.oral_marks > component_config["oral_max"]:
            raise ValidationException(
                f"oral_marks ({data.oral_marks}) exceeds configured oral_max ({component_config['oral_max']}) for subject ID {data.subject_id}."
            )
        if data.written_marks < 0 or data.written_marks > component_config["written_max"]:
            raise ValidationException(
                f"written_marks ({data.written_marks}) exceeds configured written_max ({component_config['written_max']}) for subject ID {data.subject_id}."
            )

        total_marks = component_config["total_max"]
        marks_obtained = data.akarikh_marks + data.oral_marks + data.written_marks
        percentage, grade = calculate_grade_and_percentage(marks_obtained, total_marks)
        key = (data.student_id, data.subject_id, data.exam_type_id)
        existing = existing_map.get(key)

        if existing:
            if not is_admin and existing.status == "approved":
                raise ForbiddenException(
                    "Cannot overwrite an already approved result (student "
                    f"{data.student_id}, subject {data.subject_id}). Contact the "
                    "administrator to amend it."
                )
            existing.akarikh_marks = data.akarikh_marks
            existing.oral_marks = data.oral_marks
            existing.written_marks = data.written_marks
            existing.marks_obtained = marks_obtained
            existing.total_marks = total_marks
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
                akarikh_marks=data.akarikh_marks,
                oral_marks=data.oral_marks,
                written_marks=data.written_marks,
                marks_obtained=marks_obtained,
                total_marks=total_marks,
                percentage=percentage,
                grade=grade,
                status="submitted",
                submitted_by_id=teacher_id,
                submitted_at=now
            )
            db.add(db_result)
            results.append(db_result)

    await db.commit()

    # 4. Fetch all refreshed results with joined relationships in a single bulk query
    result_ids = [r.id for r in results]
    final_results = (await db.scalars(
        select(Result).options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type)
        ).where(Result.id.in_(result_ids))
    )).unique().all()

    return list(final_results)


async def get_results_by_status(db: AsyncSession, status: Optional[str] = None) -> List[Result]:
    """Retrieve all results filtered by status, including nested relationships."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    )
    if status:
        stmt = stmt.where(Result.status == status)
        
    result = await db.execute(stmt)
    return list(result.scalars().unique().all())


async def approve_result(db: AsyncSession, result_id: int, admin_id: int, approved: bool) -> Result:
    """Approve or reject a submitted result."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    ).where(Result.id == result_id)
    
    result = await db.execute(stmt)
    db_result = result.scalar_one_or_none()
    if not db_result:
        raise ResourceNotFoundException("Result", str(result_id))
        
    if approved:
        db_result.status = "approved"
    else:
        db_result.status = "rejected"
        
    db_result.approved_by_id = admin_id
    db_result.approved_at = datetime.utcnow()
    await db.commit()
    await db.refresh(db_result)
    return db_result


async def update_result(db: AsyncSession, result_id: int, data: dict) -> Result:
    """Update an existing result (admin override)."""
    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    ).where(Result.id == result_id)

    result = await db.execute(stmt)
    db_result = result.scalar_one_or_none()
    if not db_result:
        raise ResourceNotFoundException("Result", str(result_id))

    class_name = db_result.student.school_class.class_name if db_result.student and db_result.student.school_class else None
    if not class_name:
        raise ValidationException("Student class not found for max marks lookup")

    max_marks_result = await db.execute(
        select(SubjectMaxMarks).where(
            SubjectMaxMarks.class_name == class_name,
            SubjectMaxMarks.subject_id == db_result.subject_id,
            SubjectMaxMarks.exam_type_id == db_result.exam_type_id
        )
    )
    max_record = max_marks_result.scalar_one_or_none()
    if not max_record:
        raise ValidationException(
            f"Max marks not configured for Standard '{class_name}', subject ID {db_result.subject_id}, exam type ID {db_result.exam_type_id}. Configure it first."
        )

    component_fields = ['akarikh_marks', 'oral_marks', 'written_marks']
    has_any = any(k in data for k in component_fields)

    if has_any:
        if not all(k in data for k in component_fields):
            raise ValidationException(
                "When updating component marks, all three (akarikh_marks, oral_marks, written_marks) must be provided together."
            )
        for comp_name in component_fields:
            comp_val = data[comp_name]
            if comp_val < 0:
                raise ValidationException(f"{comp_name} ({comp_val}) must be >= 0.")
        akarikh_max_db = float(max_record.akarikh_max)
        oral_max_db = float(max_record.oral_max)
        written_max_db = float(max_record.written_max)
        if data['akarikh_marks'] > akarikh_max_db:
            raise ValidationException(f"akarikh_marks ({data['akarikh_marks']}) exceeds configured akarikh_max ({akarikh_max_db}).")
        if data['oral_marks'] > oral_max_db:
            raise ValidationException(f"oral_marks ({data['oral_marks']}) exceeds configured oral_max ({oral_max_db}).")
        if data['written_marks'] > written_max_db:
            raise ValidationException(f"written_marks ({data['written_marks']}) exceeds configured written_max ({written_max_db}).")

        db_result.akarikh_marks = data['akarikh_marks']
        db_result.oral_marks = data['oral_marks']
        db_result.written_marks = data['written_marks']
        db_result.marks_obtained = data['akarikh_marks'] + data['oral_marks'] + data['written_marks']
        db_result.total_marks = float(akarikh_max_db + oral_max_db + written_max_db)
        recompute = True
    elif 'marks_obtained' in data:
        marks_obtained = data['marks_obtained']
        total_max = float(max_record.akarikh_max) + float(max_record.oral_max) + float(max_record.written_max)
        if marks_obtained < 0:
            raise ValidationException(f"Marks obtained must be >= 0.")
        if marks_obtained > total_max:
            raise ValidationException(f"Marks obtained ({marks_obtained}) exceeds total max ({total_max}).")
        db_result.marks_obtained = marks_obtained
        db_result.akarikh_marks = 0
        db_result.oral_marks = 0
        db_result.written_marks = 0
        db_result.total_marks = total_max
        recompute = True
    else:
        recompute = False

    if recompute:
        percentage, grade = calculate_grade_and_percentage(
            float(db_result.marks_obtained) if db_result.marks_obtained else 0.0,
            float(db_result.total_marks) if db_result.total_marks else 100.0,
        )
        db_result.percentage = percentage
        db_result.grade = grade

    if 'status' in data:
        db_result.status = data['status']

    await db.commit()
    await db.refresh(db_result)
    return db_result