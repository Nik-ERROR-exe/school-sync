from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.result import ResultBatchCreate, ResultResponse
from app.schemas.teacher_class_subject import TeacherClassesResponse
from app.services.result_service import create_result_batch
from app.models.teacher import Teacher
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.school_class import SchoolClass
from app.models.subject import Subject

router = APIRouter(
    prefix="/teacher/results",
    tags=["Teacher - Results Entry"]
)

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


@router.get("/my-classes", response_model=List[TeacherClassesResponse])
async def get_teacher_classes(
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all classes and subjects assigned to the current teacher.
    Used for Result Entry - shows which classes + subjects the teacher teaches.
    """
    # Query assignments for this teacher
    query = (
        db.query(
            SchoolClass.id.label("class_id"),
            SchoolClass.class_name,
            SchoolClass.division,
            Subject.id.label("subject_id"),
            Subject.subject_name
        )
        .join(TeacherClassSubject, TeacherClassSubject.class_id == SchoolClass.id)
        .join(Subject, Subject.id == TeacherClassSubject.subject_id)
        .filter(TeacherClassSubject.teacher_id == current_user.id)
        .order_by(SchoolClass.class_name, SchoolClass.division, Subject.subject_name)
    )
    
    results = await db.execute(query)
    rows = results.all()
    
    return [
        TeacherClassesResponse(
            class_id=row.class_id,
            class_name=row.class_name,
            division=row.division,
            subject_id=row.subject_id,
            subject_name=row.subject_name
        )
        for row in rows
    ]