from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.core.security import get_password_hash
from app.core.exceptions import ResourceNotFoundException, ConflictException

router = APIRouter(
    prefix="/admin/teachers",
    tags=["Admin - Teacher Management"],
    dependencies=[Depends(require_admin)]
)

@router.post("/", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(data: TeacherCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates a new teacher account. Checks for unique teacher_id and email.
    Also maps subjects_expertise if provided.
    """
    stmt = select(Teacher).where(
        (Teacher.teacher_id == data.teacher_id) | (Teacher.email == data.email)
    )
    res = await db.execute(stmt)
    if res.scalars().first():
        raise ConflictException("A teacher with this Email or Teacher ID already exists.")
        
    # Query subject entities if subject_expertise IDs are passed
    subjects = []
    if data.subject_expertise:
        sub_stmt = select(Subject).where(Subject.id.in_(data.subject_expertise))
        sub_res = await db.execute(sub_stmt)
        subjects = list(sub_res.scalars().all())

    db_teacher = Teacher(
        teacher_id=data.teacher_id,
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role,
        status=data.status,
        max_lectures_per_day=data.max_lectures_per_day,
        availability=data.availability,
        subjects_expertise=subjects
    )
    
    db.add(db_teacher)
    await db.commit()
    
    # Reload with subjects_expertise
    stmt_reload = select(Teacher).options(selectinload(Teacher.subjects_expertise)).where(Teacher.id == db_teacher.id)
    reloaded = (await db.execute(stmt_reload)).scalar()
    return reloaded

@router.get("/", response_model=List[TeacherResponse])
async def list_teachers(db: AsyncSession = Depends(get_db)):
    """
    Retrieves all teacher records with their subject expertise loaded.
    """
    stmt = select(Teacher).options(selectinload(Teacher.subjects_expertise)).order_by(Teacher.name)
    res = await db.execute(stmt)
    return list(res.scalars().all())

@router.get("/{id}", response_model=TeacherResponse)
async def get_teacher(id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieves details for a specific teacher.
    """
    stmt = select(Teacher).options(selectinload(Teacher.subjects_expertise)).where(Teacher.id == id)
    teacher = (await db.execute(stmt)).scalar_one_or_none()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    return teacher

@router.put("/{id}", response_model=TeacherResponse)
async def update_teacher(id: int, data: TeacherUpdate, db: AsyncSession = Depends(get_db)):
    """
    Updates teacher account details including subject expertise and availability.
    """
    stmt = select(Teacher).options(selectinload(Teacher.subjects_expertise)).where(Teacher.id == id)
    teacher = (await db.execute(stmt)).scalar_one_or_none()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
        
    if data.email:
        # Check that updated email does not conflict with another teacher
        email_check = await db.execute(
            select(Teacher).where(Teacher.email == data.email, Teacher.id != id)
        )
        if email_check.scalars().first():
            raise ConflictException("This email is already in use by another teacher.")
        teacher.email = data.email
        
    if data.name:
        teacher.name = data.name
    if data.password:
        teacher.password_hash = get_password_hash(data.password)
    if data.role:
        teacher.role = data.role
    if data.status:
        teacher.status = data.status
    if data.max_lectures_per_day is not None:
        teacher.max_lectures_per_day = data.max_lectures_per_day
    if data.availability is not None:
        teacher.availability = data.availability
    if data.subject_expertise is not None:
        sub_stmt = select(Subject).where(Subject.id.in_(data.subject_expertise))
        sub_res = await db.execute(sub_stmt)
        teacher.subjects_expertise = list(sub_res.scalars().all())
        
    await db.commit()
    await db.refresh(teacher)
    return teacher

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(id: int, db: AsyncSession = Depends(get_db)):
    """
    Deletes a teacher account from the database.
    """
    teacher = await db.get(Teacher, id)
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
        
    await db.delete(teacher)
    await db.commit()
    return None
