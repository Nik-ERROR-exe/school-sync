from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse
from app.schemas.teacher_class_subject import TeacherClassSubjectBatchCreate, TeacherClassSubjectResponse
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.school_class import SchoolClass
from app.core.security import get_password_hash
from app.core.exceptions import ResourceNotFoundException, ConflictException

router = APIRouter(
    prefix="/admin/teachers",
    tags=["Admin - Teacher Management"],
    dependencies=[Depends(require_admin)]
)


@router.post("/", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(data: TeacherCreate, db: AsyncSession = Depends(get_db)):
    """Create a new teacher asynchronously."""
    result = await db.execute(
        select(Teacher).where(
            (Teacher.teacher_id == data.teacher_id) | (Teacher.email == data.email)
        )
    )
    existing = result.scalars().first()
    if existing:
        raise ConflictException("A teacher with this Email or Teacher ID already exists.")
    
    db_teacher = Teacher(
        teacher_id=data.teacher_id,
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role,
        status=data.status,
        max_lectures_per_day=data.max_lectures_per_day
    )
    db.add(db_teacher)
    await db.commit()
    await db.refresh(db_teacher)
    return db_teacher


@router.get("/pending", response_model=List[TeacherResponse])
async def list_pending_teachers(db: AsyncSession = Depends(get_db)):
    """List pending teacher approvals asynchronously."""
    result = await db.execute(
        select(Teacher).where(Teacher.status == "PENDING").order_by(Teacher.name)
    )
    return list(result.scalars().all())


@router.put("/{id}/approve", response_model=TeacherResponse)
async def approve_teacher(id: int, db: AsyncSession = Depends(get_db)):
    """Approve a pending teacher registration."""
    res = await db.execute(
        select(Teacher).where(Teacher.id == id, Teacher.status == "PENDING")
    )
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Pending Teacher", str(id))
    
    id_res = await db.execute(
        select(Teacher.teacher_id).where(Teacher.teacher_id.like("T%"))
    )
    existing_ids = id_res.scalars().all()
    max_num = 0
    for tid in existing_ids:
        if tid:
            try:
                num = int(tid[1:])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    new_id_num = max_num + 1
    new_teacher_id = f"T{new_id_num:03d}"
    
    teacher.teacher_id = new_teacher_id
    teacher.status = "ACTIVE"
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.put("/{id}/reject", response_model=TeacherResponse)
async def reject_teacher(id: int, db: AsyncSession = Depends(get_db)):
    """Reject a pending teacher registration."""
    res = await db.execute(
        select(Teacher).where(Teacher.id == id, Teacher.status == "PENDING")
    )
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Pending Teacher", str(id))
    teacher.status = "INACTIVE"
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.put("/{id}/activate", response_model=TeacherResponse)
async def activate_teacher(id: int, db: AsyncSession = Depends(get_db)):
    """Activate an inactive teacher."""
    res = await db.execute(select(Teacher).where(Teacher.id == id))
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    teacher.status = "ACTIVE"
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.put("/{id}/deactivate", response_model=TeacherResponse)
async def deactivate_teacher(id: int, db: AsyncSession = Depends(get_db)):
    """Deactivate an active teacher."""
    res = await db.execute(select(Teacher).where(Teacher.id == id))
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    teacher.status = "INACTIVE"
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.get("/", response_model=List[TeacherResponse])
async def list_teachers(db: AsyncSession = Depends(get_db)):
    """List all teachers ordered by name."""
    res = await db.execute(select(Teacher).order_by(Teacher.name))
    return list(res.scalars().all())


@router.get("/{id}", response_model=TeacherResponse)
async def get_teacher(id: int, db: AsyncSession = Depends(get_db)):
    """Get teacher details by ID."""
    res = await db.execute(select(Teacher).where(Teacher.id == id))
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    return teacher


@router.put("/{id}", response_model=TeacherResponse)
async def update_teacher(id: int, data: TeacherUpdate, db: AsyncSession = Depends(get_db)):
    """Update teacher details."""
    res = await db.execute(select(Teacher).where(Teacher.id == id))
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    
    if data.email:
        chk = await db.execute(
            select(Teacher).where(Teacher.email == data.email, Teacher.id != id)
        )
        if chk.scalars().first():
            raise ConflictException("Email already in use")
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
    
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(id: int, db: AsyncSession = Depends(get_db)):
    """Delete a teacher by ID."""
    res = await db.execute(select(Teacher).where(Teacher.id == id))
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    await db.delete(teacher)
    await db.commit()
    return None


# ---------- Three-Way Class-Subject Management ----------
@router.get("/{teacher_id}/class-subjects", response_model=List[TeacherClassSubjectResponse])
async def get_teacher_class_subjects(teacher_id: int, db: AsyncSession = Depends(get_db)):
    """Get three-way class-subject mappings for a teacher."""
    res = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(teacher_id))

    try:
        stmt = (
            select(TeacherClassSubject, SchoolClass, Subject)
            .join(SchoolClass, TeacherClassSubject.class_id == SchoolClass.id)
            .join(Subject, TeacherClassSubject.subject_id == Subject.id)
            .where(TeacherClassSubject.teacher_id == teacher_id)
        )
        rows = (await db.execute(stmt)).all()
    except Exception:
        await db.rollback()
        tcs_rows = (await db.execute(
            select(TeacherClassSubject).where(TeacherClassSubject.teacher_id == teacher_id)
        )).scalars().all()
        results = []
        for tcs in tcs_rows:
            sc = (await db.execute(select(SchoolClass).where(SchoolClass.id == tcs.class_id))).scalars().first()
            sub = (await db.execute(select(Subject).where(Subject.id == tcs.subject_id))).scalars().first()
            if sc and sub:
                results.append(
                    TeacherClassSubjectResponse(
                        id=tcs.id,
                        teacher_id=tcs.teacher_id,
                        class_id=tcs.class_id,
                        subject_id=tcs.subject_id,
                        class_name=sc.class_name,
                        division=sc.division,
                        subject_name=sub.subject_name,
                        code=sub.code
                    )
                )
        return results

    results = []
    for tcs, sc, sub in rows:
        results.append(
            TeacherClassSubjectResponse(
                id=tcs.id,
                teacher_id=tcs.teacher_id,
                class_id=tcs.class_id,
                subject_id=tcs.subject_id,
                class_name=sc.class_name,
                division=sc.division,
                subject_name=sub.subject_name,
                code=sub.code
            )
        )
    return results


@router.post("/{teacher_id}/class-subjects", response_model=List[TeacherClassSubjectResponse])
async def set_teacher_class_subjects(
    teacher_id: int,
    body: TeacherClassSubjectBatchCreate,
    db: AsyncSession = Depends(get_db)
):
    """Replace all three-way class-subject assignments for a teacher."""
    res = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    teacher = res.scalars().first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(teacher_id))

    # Deduplicate assignments
    unique = {}
    for item in body.assignments:
        unique[(item.class_id, item.subject_id)] = item

    class_ids = {item.class_id for item in unique.values()}
    subject_ids = {item.subject_id for item in unique.values()}

    # Validate existence of classes and subjects
    if class_ids:
        found_classes = set((await db.scalars(select(SchoolClass.id).where(SchoolClass.id.in_(class_ids)))).all())
        missing_classes = class_ids - found_classes
        if missing_classes:
            raise HTTPException(status_code=400, detail=f"Class IDs not found: {list(missing_classes)}")

    if subject_ids:
        found_subjects = set((await db.scalars(select(Subject.id).where(Subject.id.in_(subject_ids)))).all())
        missing_subjects = subject_ids - found_subjects
        if missing_subjects:
            raise HTTPException(status_code=400, detail=f"Subject IDs not found: {list(missing_subjects)}")

    # Replace all three-way assignments for this teacher
    await db.execute(delete(TeacherClassSubject).where(TeacherClassSubject.teacher_id == teacher_id))
    for item in unique.values():
        db.add(TeacherClassSubject(
            teacher_id=teacher_id,
            class_id=item.class_id,
            subject_id=item.subject_id
        ))

    await db.commit()

    # Return the fresh list
    return await get_teacher_class_subjects(teacher_id, db)