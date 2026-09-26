import asyncio
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, cast, Integer
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.result import Result
from app.models.student import Student
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.school_class import SchoolClass, class_subjects
from app.models.subject_exam_component import SubjectExamComponent
from app.models.result_component import ResultComponent
from app.schemas.result import ResultBatchCreate, ResultResponse, ResultUpdate, ResultBatchCreateWithComponents
from app.services.result_service import (
    calculate_grade_and_percentage,
    create_result_batch_with_components,
    calculate_class_overall_results,
    update_result_with_components,
)
from app.services.report_service import generate_results_excel

router = APIRouter(
    prefix="/admin/results",
    tags=["Admin - Student Results"],
    dependencies=[Depends(require_admin)]
)


@router.get("/", response_model=List[ResultResponse])
async def list_results(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Flat list of all results, filterable by status asynchronously."""
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

    res = await db.execute(stmt)
    results = res.scalars().unique().all()
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
async def create_or_update_results(
    req: ResultBatchCreateWithComponents,
    admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create or update results directly as an admin asynchronously."""
    results = await create_result_batch_with_components(db, req.results, admin.id, is_admin=True)
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
async def get_results_by_class_and_exam(
    class_id: int,
    exam_type_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Returns results grouped by student for a given class and exam type asynchronously."""
    # 1. Fetch subjects assigned to this class
    school_class = (await db.execute(
        select(SchoolClass).where(SchoolClass.id == class_id)
    )).scalars().first()
    if school_class is None:
        return {"students": [], "subjects": []}

    subjects_stmt = (
        select(Subject)
        .join(class_subjects, Subject.id == class_subjects.c.subject_id)
        .where(class_subjects.c.class_id == class_id)
        .order_by(Subject.subject_name)
    )
    subj_res = await db.execute(subjects_stmt)
    subjects = list(subj_res.scalars().all())
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
    res_results = await db.execute(results_stmt)
    results = res_results.scalars().unique().all()

    # Also include any subjects present in results that might not be in class_subjects mapping
    for r in results:
        if r.subject and r.subject_id not in subject_map:
            subjects.append(r.subject)
            subject_map[r.subject_id] = r.subject

    subjects.sort(key=lambda s: s.subject_name)

    smm_stmt = select(SubjectExamComponent).where(
        SubjectExamComponent.class_name == school_class.class_name,
        SubjectExamComponent.exam_type_id == exam_type_id,
    )
    smm_records = (await db.execute(smm_stmt)).scalars().unique().all()
    comps_by_subject = {}
    for c in smm_records:
        comps_by_subject.setdefault(c.subject_id, []).append({
            "component_code": c.component_code,
            "display_label": c.display_label,
            "max_marks": float(c.max_marks),
            "display_order": c.display_order,
        })

    subject_list = []
    for s in subjects:
        subject_list.append({
            "id": s.id,
            "name": s.subject_name,
            "components": comps_by_subject.get(s.id, []),
        })

    # One query for all result_components in this class/exam batch
    result_ids = [r.id for r in results]
    rc_lookup = {}
    if result_ids:
        rc_stmt = select(ResultComponent).where(ResultComponent.result_id.in_(result_ids))
        for rc in (await db.execute(rc_stmt)).scalars().all():
            rc_lookup.setdefault(rc.result_id, []).append({
                "component_code": rc.component_code,
                "marks_obtained": float(rc.marks_obtained),
            })

    # Build lookup table for existing results: (student_id, subject_id) -> Result
    results_lookup = {(r.student_id, r.subject_id): r for r in results}

    # 3. Compute overall class summary (totals, percentage, overall grade, rank)
    overall_summary = await calculate_class_overall_results(db, class_id, exam_type_id)

    # 4. Fetch all students in this class
    students_stmt = (
        select(Student)
        .where(Student.class_id == class_id)
        .order_by(cast(Student.roll_no, Integer), Student.id)
    )
    std_res = await db.execute(students_stmt)
    students = std_res.scalars().all()

    # 5. Construct response for each student
    students_list = []
    for student in students:
        student_subjects = []
        for subj in subjects:
            r = results_lookup.get((student.id, subj.id))
            if r:
                student_subjects.append({
                    "subject_id": subj.id,
                    "subject_name": subj.subject_name,
                    "components": rc_lookup.get(r.id, []),
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
                    "components": [],
                    "marks_obtained": None,
                    "total_marks": None,
                    "percentage": None,
                    "grade": None,
                    "status": None,
                    "result_id": None,
                })

        student_overall = overall_summary.get(student.id, {
            "total_obtained": 0.0,
            "total_max": 0.0,
            "percentage": 0.0,
            "grade": "-",
            "rank": None
        })

        students_list.append({
            "student_id": student.id,
            "roll_no": student.roll_no or "",
            "name": student.name,
            "total_obtained": student_overall["total_obtained"],
            "total_max": student_overall["total_max"],
            "percentage": student_overall["percentage"],
            "grade": student_overall["grade"],
            "rank": student_overall["rank"],
            "subjects": student_subjects,
        })

    return {"students": students_list, "subjects": subject_list}


@router.put("/{result_id}", response_model=ResultResponse)
async def update_result(
    result_id: int,
    data: ResultUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update marks for a single result record (admin override) asynchronously."""
    update_data = data.model_dump(exclude_unset=True)

    try:
        result = await update_result_with_components(db, result_id, update_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
async def export_results(
    class_id: int = Query(...),
    exam_type_id: int = Query(...),
    format: str = Query("csv"),
    db: AsyncSession = Depends(get_db)
):
    # 1) Resolve class and exam
    school_class = (await db.execute(
        select(SchoolClass).where(SchoolClass.id == class_id)
    )).scalars().first()
    if school_class is None:
        raise HTTPException(status_code=404, detail="Class not found")

    exam_type = (await db.execute(
        select(ExamType).where(ExamType.id == exam_type_id)
    )).scalars().first()
    if exam_type is None:
        raise HTTPException(status_code=404, detail="Exam type not found")

    # 2) Component definitions for this class / exam
    smm_stmt = select(SubjectExamComponent).where(
        SubjectExamComponent.class_name == school_class.class_name,
        SubjectExamComponent.exam_type_id == exam_type_id,
    )
    smm_records = (await db.execute(smm_stmt)).scalars().unique().all()
    comps_by_subject = {}
    for c in smm_records:
        comps_by_subject.setdefault(c.subject_id, []).append({
            "code": c.component_code,
            "label": c.display_label,
            "max_marks": float(c.max_marks),
            "display_order": c.display_order,
        })
    for lst in comps_by_subject.values():
        lst.sort(key=lambda c: (c["display_order"], c["code"]))

    subjects_stmt = (
        select(Subject)
        .join(class_subjects, Subject.id == class_subjects.c.subject_id)
        .where(class_subjects.c.class_id == class_id)
        .order_by(Subject.subject_name)
    )
    subjects = list((await db.execute(subjects_stmt)).scalars().all())
    payload_subjects = []
    for s in subjects:
        payload_subjects.append({
            "id": s.id,
            "name": s.subject_name,
            "components": comps_by_subject.get(s.id, []),
        })

    # 3) Results with component rows loaded
    results_stmt = (
        select(Result)
        .options(
            joinedload(Result.student).joinedload(Student.school_class),
            joinedload(Result.subject),
            joinedload(Result.exam_type),
            joinedload(Result.components),
        )
        .join(Result.student)
        .where(
            Student.class_id == class_id,
            Result.exam_type_id == exam_type_id,
        )
        .order_by(cast(Student.roll_no, Integer))
    )
    results = (await db.execute(results_stmt)).scalars().unique().all()

    # 4) Build student payload with per-subject component values
    from collections import defaultdict
    student_map = defaultdict(lambda: {"roll_no": "", "name": "", "subjects": {}})
    for r in results:
        st = student_map[r.student_id]
        st["roll_no"] = (r.student.roll_no or "") if r.student else ""
        st["name"] = (r.student.name or "") if r.student else ""
        comps = {rc.component_code: float(rc.marks_obtained) for rc in (r.components or [])}
        st["subjects"][r.subject_id] = {
            "components": comps,
            "subtotal": round(sum(comps.values()), 2) if comps else None,
            "total_max": float(r.total_marks) if r.total_marks is not None else 0.0,
        }

    payload_students = []
    for sid in sorted(student_map.keys(), key=lambda s: int(student_map[s]["roll_no"] or 0)):
        st = student_map[sid]
        total_obtained = 0.0
        total_max = 0.0
        has_any = False
        subject_data = {}
        for subj in payload_subjects:
            subj_max = sum(c["max_marks"] for c in subj["components"])
            total_max += subj_max
            sd = st["subjects"].get(subj["id"])
            if sd is None:
                subject_data[subj["id"]] = {"components": {}, "subtotal": None}
                continue
            subject_data[subj["id"]] = sd
            if sd["subtotal"] is not None:
                total_obtained += sd["subtotal"]
                has_any = True
        pct = (total_obtained * 100.0 / total_max) if total_max > 0 else 0.0

        # Pass/Fail: any subject with configured components below 35% of its max => F
        result_status = "P"
        any_configured = False
        for subj in payload_subjects:
            comps = subj["components"]
            if not comps:
                continue
            any_configured = True
            subj_max = sum(c["max_marks"] for c in comps)
            sd = subject_data.get(subj["id"]) or {}
            subtotal = sum(float((sd.get("components") or {}).get(c["code"], 0) or 0) for c in comps)
            if subj_max > 0 and subtotal < 0.35 * subj_max:
                result_status = "F"
                break
        if not any_configured:
            result_status = "F"

        payload_students.append({
            "roll_no": st["roll_no"],
            "name": st["name"],
            "subject_data": subject_data,
            "grand_total": round(total_obtained, 2) if has_any else None,
            "grand_max": round(total_max, 2) if has_any else None,
            "percentage": round(pct, 2) if has_any else None,
            "grade": calculate_grade_and_percentage(total_obtained, total_max)[1] if has_any else "",
            "result_status": result_status,
        })

    payload = {
        "school_name": "Amarkor Vidyalaya",
        "class_display": f"{school_class.class_name} - {school_class.division}",
        "exam_name": exam_type.name,
        "subjects": payload_subjects,
        "students": payload_students,
    }

    if format == "excel":
        buffer = await asyncio.to_thread(generate_results_excel, payload)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=results_class{class_id}_exam{exam_type_id}.xlsx"}
        )

    # 6) Component-aware CSV export
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Roll No", "Student Name", "Subject", "Component", "Marks", "Max"])
    for stu in payload_students:
        for s in payload_subjects:
            sd = stu["subject_data"].get(s["id"]) or {}
            marks_map = sd.get("components") or {}
            for comp in s.get("components") or []:
                writer.writerow([
                    stu["roll_no"],
                    stu["name"],
                    s["name"],
                    comp["label"],
                    marks_map.get(comp["code"], ""),
                    comp["max_marks"],
                ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=results_class{class_id}_exam_{exam_type_id}.csv"},
    )