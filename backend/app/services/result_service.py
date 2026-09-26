from sqlalchemy import cast, Integer, delete
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.result import Result
from app.models.student import Student
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.subject_exam_component import SubjectExamComponent
from app.models.result_component import ResultComponent
from app.schemas.result import ResultCreate, ResultCreateWithComponents

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


async def get_subject_components(
    db: AsyncSession,
    class_name: str,
    subject_id: int,
    exam_type_id: int,
) -> list[SubjectExamComponent]:
    stmt = (
        select(SubjectExamComponent)
        .where(
            SubjectExamComponent.class_name == class_name,
            SubjectExamComponent.subject_id == subject_id,
            SubjectExamComponent.exam_type_id == exam_type_id,
        )
        .order_by(SubjectExamComponent.display_order, SubjectExamComponent.id)
    )
    return list((await db.scalars(stmt)).all())


async def create_result_batch_with_components(
    db: AsyncSession,
    results_data: list[ResultCreateWithComponents],
    teacher_id: int,
    is_admin: bool = False,
) -> list[Result]:
    """
    Component-aware replacement for create_result_batch. Stages the
    same authorization and approval rules as the old function but
    writes ResultComponent rows instead of the three fixed component
    columns. Still writes denormalized marks_obtained/total_marks/
    percentage/grade to the Result row for backward compatibility.
    """
    if not results_data:
        return []

    # 1. Bulk validate existence of Students, Subjects, and ExamTypes
    student_ids = {d.student_id for d in results_data}
    subject_ids = {d.subject_id for d in results_data}
    exam_type_ids = {d.exam_type_id for d in results_data}

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

    # 2. Authorization check
    if not is_admin:
        await _check_teacher_authorized(db, results_data, student_ids, teacher_id)

    # 3. Students with school_class to build student_id -> class_name map
    students = (await db.scalars(
        select(Student)
        .options(joinedload(Student.school_class))
        .where(Student.id.in_(student_ids))
    )).all()
    student_class_name_map = {
        s.id: s.school_class.class_name for s in students if s.school_class
    }

    # 4. Existing results for the batch
    existing_results = (await db.scalars(
        select(Result).where(
            Result.student_id.in_(student_ids),
            Result.subject_id.in_(subject_ids),
            Result.exam_type_id.in_(exam_type_ids)
        )
    )).all()
    existing_map = {(r.student_id, r.subject_id, r.exam_type_id): r for r in existing_results}

    # 5. All needed SubjectExamComponent rows in ONE query
    class_names = {c for c in student_class_name_map.values() if c}
    comp_stmt = select(SubjectExamComponent).where(
        SubjectExamComponent.class_name.in_(class_names),
        SubjectExamComponent.subject_id.in_(subject_ids),
        SubjectExamComponent.exam_type_id.in_(exam_type_ids),
    )
    all_components = (await db.scalars(comp_stmt)).all()

    components_by_key: dict[tuple, list[SubjectExamComponent]] = {}
    for c in all_components:
        components_by_key.setdefault(
            (c.class_name, c.subject_id, c.exam_type_id), []
        ).append(c)
    for v in components_by_key.values():
        v.sort(key=lambda c: (c.display_order, c.id))

    # 6. Validate + persist
    results = []
    now = datetime.utcnow()
    for d in results_data:
        c_name = student_class_name_map.get(d.student_id)
        key = (c_name, d.subject_id, d.exam_type_id)
        config_components = components_by_key.get(key, [])

        if not config_components:
            raise ValidationException(
                f"No components configured for class '{c_name}', "
                f"subject ID {d.subject_id}, exam type ID "
                f"{d.exam_type_id}. Configure them first."
            )

        config_by_code = {c.component_code: c for c in config_components}
        provided = {c.component_code: c for c in d.components}

        for code in provided:
            if code not in config_by_code:
                raise ValidationException(
                    f"Component '{code}' is not configured for class "
                    f"'{c_name}', subject {d.subject_id}, exam "
                    f"{d.exam_type_id}."
                )

        for code, entry in provided.items():
            if entry.marks_obtained < 0:
                raise ValidationException(
                    f"Component '{code}' marks_obtained "
                    f"({entry.marks_obtained}) cannot be negative."
                )
            component_max = float(config_by_code[code].max_marks)
            if entry.marks_obtained > component_max:
                raise ValidationException(
                    f"Component '{code}' marks_obtained "
                    f"({entry.marks_obtained}) exceeds configured max_marks "
                    f"({component_max}) for class '{c_name}', subject "
                    f"{d.subject_id}, exam {d.exam_type_id}."
                )

        marks_obtained = sum(e.marks_obtained for e in provided.values())
        total_marks = sum(float(c.max_marks) for c in config_components)
        percentage, grade = calculate_grade_and_percentage(marks_obtained, total_marks)

        rkey = (d.student_id, d.subject_id, d.exam_type_id)
        existing = existing_map.get(rkey)

        if existing:
            if not is_admin and existing.status == "approved":
                raise ForbiddenException(
                    "Cannot overwrite an already approved result (student "
                    f"{d.student_id}, subject {d.subject_id}). Contact the "
                    "administrator to amend it."
                )
            existing.marks_obtained = marks_obtained
            existing.total_marks = total_marks
            existing.percentage = percentage
            existing.grade = grade
            existing.status = "submitted"
            existing.submitted_by_id = teacher_id
            existing.submitted_at = now
            await db.execute(
                delete(ResultComponent).where(ResultComponent.result_id == existing.id)
            )
            target_result = existing
        else:
            target_result = Result(
                student_id=d.student_id,
                subject_id=d.subject_id,
                exam_type_id=d.exam_type_id,
                marks_obtained=marks_obtained,
                total_marks=total_marks,
                percentage=percentage,
                grade=grade,
                status="submitted",
                submitted_by_id=teacher_id,
                submitted_at=now,
            )
            db.add(target_result)
            await db.flush()

        for code, entry in provided.items():
            db.add(ResultComponent(
                result_id=target_result.id,
                component_code=code,
                marks_obtained=entry.marks_obtained,
            ))

        results.append(target_result)

    await db.commit()

    # 7. Reload with joined relationships
    result_ids = [r.id for r in results]
    final_results = (await db.scalars(
        select(Result).options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type),
            joinedload(Result.components),
        ).where(Result.id.in_(result_ids))
    )).unique().all()

    return list(final_results)


async def update_result_with_components(
    db: AsyncSession,
    result_id: int,
    data: dict,
) -> Result:
    """
    Component-aware replacement for update_result. Requires the components
    key; any other update shape is rejected.
    """
    if "components" not in data:
        raise ValidationException("components is required when updating a result.")

    stmt = select(Result).options(
        joinedload(Result.student).joinedload(Student.school_class),
        joinedload(Result.subject),
        joinedload(Result.exam_type)
    ).where(Result.id == result_id)

    res = await db.execute(stmt)
    db_result = res.scalar_one_or_none()
    if not db_result:
        raise ResourceNotFoundException("Result", str(result_id))

    class_name = db_result.student.school_class.class_name if db_result.student and db_result.student.school_class else None
    if not class_name:
        raise ValidationException("Student class not found for max marks lookup")

    config_components = await get_subject_components(
        db, class_name, db_result.subject_id, db_result.exam_type_id
    )
    if not config_components:
        raise ValidationException(
            f"No components configured for class '{class_name}', "
            f"subject ID {db_result.subject_id}, exam type ID "
            f"{db_result.exam_type_id}. Configure them first."
        )

    config_by_code = {c.component_code: c for c in config_components}
    provided = {c["component_code"]: c for c in data["components"]}

    for code in provided:
        if code not in config_by_code:
            raise ValidationException(
                f"Component '{code}' is not configured for class "
                f"'{class_name}', subject {db_result.subject_id}, exam "
                f"{db_result.exam_type_id}."
            )

    for code, entry in provided.items():
        marks = entry["marks_obtained"]
        if marks < 0:
            raise ValidationException(
                f"Component '{code}' marks_obtained "
                f"({marks}) cannot be negative."
            )
        component_max = float(config_by_code[code].max_marks)
        if marks > component_max:
            raise ValidationException(
                f"Component '{code}' marks_obtained "
                f"({marks}) exceeds configured max_marks "
                f"({component_max}) for class '{class_name}', subject "
                f"{db_result.subject_id}, exam {db_result.exam_type_id}."
            )

    marks_obtained = sum(float(e["marks_obtained"]) for e in provided.values())
    total_marks = sum(float(c.max_marks) for c in config_components)
    percentage, grade = calculate_grade_and_percentage(marks_obtained, total_marks)

    await db.execute(
        delete(ResultComponent).where(ResultComponent.result_id == db_result.id)
    )
    for code, entry in provided.items():
        db.add(ResultComponent(
            result_id=db_result.id,
            component_code=code,
            marks_obtained=entry["marks_obtained"],
        ))

    db_result.marks_obtained = marks_obtained
    db_result.total_marks = total_marks
    db_result.percentage = percentage
    db_result.grade = grade

    if "status" in data:
        db_result.status = data["status"]

    await db.commit()
    await db.refresh(db_result)
    return db_result


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

