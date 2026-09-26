
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, Integer
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.result import Result
from app.models.subject import Subject
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.school_class import SchoolClass, class_subjects
from app.schemas.result import ResultBatchCreate, ResultResponse, ResultSubmitRequest, ResultCreate
from app.services.result_service import create_result_batch, calculate_class_overall_results

router = APIRouter(prefix="/teacher/results", tags=["Teacher - Results"])

@router.post("/submit", status_code=status.HTTP_200_OK)
async def submit_results(
    req: ResultSubmitRequest,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits student results grouped by class, subject, and exam type.
    """
    results_data = [
        ResultCreate(
            student_id=m.student_id,
            subject_id=req.subject_id,
            exam_type_id=req.exam_type_id,
            akarikh_marks=0,
            oral_marks=0,
            written_marks=0,
        )
        for m in req.marks
    ]
    await create_result_batch(db, results_data, current_user.id)
    return {"message": "Results submitted successfully"}

@router.post("/", response_model=List[ResultResponse], status_code=status.HTTP_201_CREATED)
async def submit_student_results(
    req: ResultBatchCreate,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits or updates a batch of student exam marks. Results are initialized with 'submitted' status.
    """
    results = await create_result_batch(db, req.results, current_user.id)

    # Map raw models to response list
    response_data = []
    for r in results:
        response_data.append(
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
                akarikh_marks=r.akarikh_marks,
                oral_marks=r.oral_marks,
                written_marks=r.written_marks,
                marks_obtained=r.marks_obtained,
                total_marks=r.total_marks,
                percentage=r.percentage,
                grade=r.grade,
                status=r.status,
                submitted_by_id=r.submitted_by_id,
                approved_by_id=r.approved_by_id
            )
        )
    return response_data


@router.get("/class/{class_id}/exam/{exam_type_id}")
async def get_results_by_class_and_exam(
    class_id: int,
    exam_type_id: int,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns results grouped by student for a given class and exam type.
    Only includes subjects the teacher teaches in this class.
    Format: { students: [...], subjects: [...] }
    Includes student overall total marks, percentage, grade, and rank.
    """
    # 1. Verify teacher teaches in this class
    teaches_here = (await db.execute(
        select(TeacherClassSubject.id).where(
            TeacherClassSubject.teacher_id == current_user.id,
            TeacherClassSubject.class_id == class_id
        ).limit(1)
    )).scalar_one_or_none()

    if not teaches_here:
        raise HTTPException(status_code=403, detail="You are not assigned to this class.")

    school_class = (await db.execute(
        select(SchoolClass).where(SchoolClass.id == class_id)
    )).scalars().first()
    if school_class is None:
        return {"students": [], "subjects": []}

    # 2. Fetch subjects this teacher teaches in this class
    subject_ids = (await db.execute(
        select(TeacherClassSubject.subject_id)
        .where(
            TeacherClassSubject.teacher_id == current_user.id,
            TeacherClassSubject.class_id == class_id
        )
        .distinct()
    )).scalars().all()

    if not subject_ids:
        return {"students": [], "subjects": []}

    subjects_stmt = (
        select(Subject)
        .where(Subject.id.in_(subject_ids))
        .order_by(Subject.subject_name)
    )
    subjects = list((await db.execute(subjects_stmt)).scalars().all())
    subject_map = {s.id: s for s in subjects}

    # 3. Fetch existing results for this class and exam type
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
            Result.subject_id.in_(subject_ids)
        )
    )
    results = (await db.execute(results_stmt)).scalars().unique().all()

    # Build lookup table for existing results: (student_id, subject_id) -> Result
    results_lookup = {(r.student_id, r.subject_id): r for r in results}

    # 4. Compute overall class summary (totals, percentage, overall grade, rank)
    overall_summary = await calculate_class_overall_results(db, class_id, exam_type_id)

    # 5. Fetch all students in this class
    students_stmt = (
        select(Student)
        .where(Student.class_id == class_id)
        .order_by(cast(Student.roll_no, Integer), Student.id)
    )
    students = (await db.execute(students_stmt)).scalars().all()

    # 6. Construct response for each student
    students_list = []
    for student in students:
        student_subjects = []
        for subj in subjects:
            r = results_lookup.get((student.id, subj.id))
            if r:
                student_subjects.append({
                    "subject_id": subj.id,
                    "subject_name": subj.subject_name,
                    "akarikh_marks": float(r.akarikh_marks),
                    "oral_marks": float(r.oral_marks),
                    "written_marks": float(r.written_marks),
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
                    "akarikh_marks": None,
                    "oral_marks": None,
                    "written_marks": None,
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

    smm_stmt = select(SubjectMaxMarks).where(
        SubjectMaxMarks.class_name == school_class.class_name,
        SubjectMaxMarks.exam_type_id == exam_type_id,
    )
    smm_records = (await db.execute(smm_stmt)).scalars().all()
    smm_lookup = {r.subject_id: r for r in smm_records}

    subject_list = []
    for s in subjects:
        m = smm_lookup.get(s.id)
        subject_list.append({
            "id": s.id,
            "name": s.subject_name,
            "akarikh_max": float(m.akarikh_max) if m else 0.0,
            "oral_max": float(m.oral_max) if m else 0.0,
            "written_max": float(m.written_max) if m else 0.0,
            "total_max": float(m.max_marks) if m else 0.0,
        })

    return {"students": students_list, "subjects": subject_list}
