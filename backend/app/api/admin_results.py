from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.result import Result
from app.models.student import Student
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.school_class import SchoolClass, class_subjects
from app.schemas.result import ResultBatchCreate, ResultResponse, ResultUpdate
from app.services.result_service import calculate_grade_and_percentage, create_result_batch
from app.services.report_service import generate_results_excel
import csv
import io

router = APIRouter(
    prefix="/admin/results",
    tags=["Admin - Student Results"],
    dependencies=[Depends(require_admin)]
)


@router.get("/", response_model=List[ResultResponse])
def list_results(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Flat list of all results, filterable by status."""
    stmt = (
        select(Result)
        .options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type),
        )
    )
    if status:
        stmt = stmt.where(Result.status == status)

    results = db.execute(stmt).scalars().unique().all()
    return [
        ResultResponse(
            id=r.id,
            student_id=r.student_id,
            student_roll_no=r.student.roll_no if r.student else None,
            student_name=r.student.name if r.student else None,
            student_class=r.student.school_class.class_name if r.student and r.student.school_class else None,
            student_division=r.student.school_class.division if r.student and r.student.school_class else None,
            subject_id=r.subject_id,
            subject_name=r.subject.subject_name if r.subject else None,
            subject_code=r.subject.code if r.subject else None,
            exam_type_id=r.exam_type_id,
            exam_type_name=r.exam_type.name if r.exam_type else None,
            marks_obtained=r.marks_obtained,
            total_marks=r.total_marks,
            percentage=r.percentage,
            grade=r.grade,
            status=r.status,
            submitted_by_id=r.submitted_by_id,
            approved_by_id=r.approved_by_id,
        )
        for r in results
    ]


@router.post("/", response_model=List[ResultResponse], status_code=201)
def create_or_update_results(
    req: ResultBatchCreate,
    admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create or update results directly as an admin.

    Allows the admin to enter marks for any student/subject even when no
    teacher submission exists yet. Upserts on (student_id, subject_id, exam_type_id).
    """
    results = create_result_batch(db, req.results, admin.id, is_admin=True)
    return [
        ResultResponse(
            id=r.id,
            student_id=r.student_id,
            student_roll_no=r.student.roll_no if r.student else None,
            student_name=r.student.name if r.student else None,
            student_class=r.student.school_class.class_name if r.student and r.student.school_class else None,
            student_division=r.student.school_class.division if r.student and r.student.school_class else None,
            subject_id=r.subject_id,
            subject_name=r.subject.subject_name if r.subject else None,
            subject_code=r.subject.code if r.subject else None,
            exam_type_id=r.exam_type_id,
            exam_type_name=r.exam_type.name if r.exam_type else None,
            marks_obtained=r.marks_obtained,
            total_marks=r.total_marks,
            percentage=r.percentage,
            grade=r.grade,
            status=r.status,
            submitted_by_id=r.submitted_by_id,
            approved_by_id=r.approved_by_id,
        )
        for r in results
    ]


@router.get("/class/{class_id}/exam/{exam_type_id}")
def get_results_by_class_and_exam(
    class_id: int,
    exam_type_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns results grouped by student for a given class and exam type.
    Format: { students: [...], subjects: [...] }
    """
    # 1. Fetch subjects assigned to this class
    subjects_stmt = (
        select(Subject)
        .join(class_subjects, Subject.id == class_subjects.c.subject_id)
        .where(class_subjects.c.class_id == class_id)
        .order_by(Subject.subject_name)
    )
    subjects = list(db.execute(subjects_stmt).scalars().all())
    subject_map = {s.id: s for s in subjects}

    # 2. Fetch existing results for this class and exam type
    results_stmt = (
        select(Result)
        .options(
            joinedload(Result.student),
            joinedload(Result.subject),
        )
        .join(Result.student)
        .where(
            Student.class_id == class_id,
            Result.exam_type_id == exam_type_id,
        )
    )
    results = db.execute(results_stmt).scalars().unique().all()

    # Also include any subjects present in results that might not be in class_subjects mapping
    for r in results:
        if r.subject and r.subject_id not in subject_map:
            subjects.append(r.subject)
            subject_map[r.subject_id] = r.subject

    subjects.sort(key=lambda s: s.subject_name)
    subject_list = [{"id": s.id, "name": s.subject_name} for s in subjects]

    # Build lookup table for existing results: (student_id, subject_id) -> Result
    results_lookup = {(r.student_id, r.subject_id): r for r in results}

    # 3. Fetch all students in this class
    students_stmt = (
        select(Student)
        .where(Student.class_id == class_id)
        .order_by(Student.roll_no, Student.id)
    )
    students = db.execute(students_stmt).scalars().all()

    # 4. Construct response for each student
    students_list = []
    for student in students:
        student_subjects = []
        for subj in subjects:
            r = results_lookup.get((student.id, subj.id))
            if r:
                student_subjects.append({
                    "subject_id": subj.id,
                    "subject_name": subj.subject_name,
                    "marks_obtained": r.marks_obtained,
                    "total_marks": r.total_marks,
                    "percentage": r.percentage,
                    "grade": r.grade,
                    "status": r.status,
                    "result_id": r.id,
                })
            else:
                student_subjects.append({
                    "subject_id": subj.id,
                    "subject_name": subj.subject_name,
                    "marks_obtained": None,
                    "total_marks": None,
                    "percentage": None,
                    "grade": None,
                    "status": None,
                    "result_id": None,
                })
        students_list.append({
            "student_id": student.id,
            "roll_no": student.roll_no or "",
            "name": student.name,
            "subjects": student_subjects,
        })

    return {"students": students_list, "subjects": subject_list}


@router.put("/{result_id}", response_model=ResultResponse)
def update_result(
    result_id: int,
    data: ResultUpdate,
    db: Session = Depends(get_db)
):
    """Update marks for a single result record."""
    stmt = (
        select(Result)
        .options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type),
        )
        .where(Result.id == result_id)
    )
    result = db.execute(stmt).scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    if data.marks_obtained is not None:
        result.marks_obtained = data.marks_obtained
    if data.total_marks is not None:
        result.total_marks = data.total_marks

    # Recalculate percentage and grade
    if result.total_marks > 0:
        percentage, grade = calculate_grade_and_percentage(
            result.marks_obtained, result.total_marks
        )
        result.percentage = percentage
        result.grade = grade

    db.commit()

    return ResultResponse(
        id=result.id,
        student_id=result.student_id,
        student_roll_no=result.student.roll_no if result.student else None,
        student_name=result.student.name if result.student else None,
        student_class=result.student.school_class.class_name if result.student and result.student.school_class else None,
        student_division=result.student.school_class.division if result.student and result.student.school_class else None,
        subject_id=result.subject_id,
        subject_name=result.subject.subject_name if result.subject else None,
        subject_code=result.subject.code if result.subject else None,
        exam_type_id=result.exam_type_id,
        exam_type_name=result.exam_type.name if result.exam_type else None,
        marks_obtained=result.marks_obtained,
        total_marks=result.total_marks,
        percentage=result.percentage,
        grade=result.grade,
        status=result.status,
        submitted_by_id=result.submitted_by_id,
        approved_by_id=result.approved_by_id,
    )


@router.get("/export")
def export_results(
    class_id: int = Query(...),
    exam_type_id: int = Query(...),
    format: str = Query("csv"),
    db: Session = Depends(get_db)
):
    """Export results for a class and exam type as CSV or Excel (.xlsx)."""
    # Fetch results similar to the class/exam endpoint. Subject is loaded via
    # joinedload (aliased to subjects_1 in SQL), so it must NOT be referenced
    # in ORDER BY — sorting by subject is done in Python instead.
    stmt = (
        select(Result)
        .options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type),
        )
        .join(Result.student)
        .where(
            Student.class_id == class_id,
            Result.exam_type_id == exam_type_id,
        )
        .order_by(Student.roll_no)
    )
    results = db.execute(stmt).scalars().unique().all()

    # Sort by roll number, then subject name (avoid UndefinedColumn on the
    # joinedload-aliased subjects table).
    results = sorted(
        results,
        key=lambda r: (
            r.student.roll_no if r.student else "",
            r.subject.subject_name if r.subject else "",
        ),
    )

    if format == "excel":
        buffer = generate_results_excel(results)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=results_class{class_id}_exam{exam_type_id}.xlsx"}
        )

    # Build CSV (default)
    output = io.StringIO()
    writer = csv.writer(output)
    # Header
    writer.writerow(["Roll No", "Student Name", "Subject", "Marks Obtained", "Total Marks", "Percentage", "Grade", "Status"])
    for r in results:
        writer.writerow([
            r.student.roll_no if r.student else "",
            r.student.name if r.student else "",
            r.subject.subject_name if r.subject else "",
            r.marks_obtained,
            r.total_marks,
            f"{r.percentage:.2f}" if r.percentage else "",
            r.grade,
            r.status,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=results_class{class_id}_exam{exam_type_id}.csv"}
    )