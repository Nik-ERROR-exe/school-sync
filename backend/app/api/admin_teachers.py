from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse, SubjectResponse, TeacherSubjectsUpdate
from app.schemas.teacher_class_subject import TeacherClassSubjectBatchCreate, TeacherClassSubjectResponse
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.teacher_subjects import teacher_subjects
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.school_class import SchoolClass
from app.core.security import get_password_hash
from app.core.exceptions import ResourceNotFoundException, ConflictException

router = APIRouter(
    prefix="/admin/teachers",
    tags=["Admin - Teacher Management"],
    dependencies=[Depends(require_admin)]
)

# ----------------------- Existing endpoints unchanged -----------------------
@router.post("/", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db)):
    existing = db.query(Teacher).filter(
        (Teacher.teacher_id == data.teacher_id) | (Teacher.email == data.email)
    ).first()
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
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

@router.get("/pending", response_model=List[TeacherResponse])
def list_pending_teachers(db: Session = Depends(get_db)):
    teachers = db.query(Teacher).filter(Teacher.status == "PENDING").order_by(Teacher.name).all()
    return teachers

@router.put("/{id}/approve", response_model=TeacherResponse)
def approve_teacher(id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id, Teacher.status == "PENDING").first()
    if not teacher:
        raise ResourceNotFoundException("Pending Teacher", str(id))
    
    existing_ids = db.query(Teacher.teacher_id).filter(Teacher.teacher_id.like("T%")).all()
    max_num = 0
    for tid in existing_ids:
        if tid[0]:
            try:
                num = int(tid[0][1:])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    new_id_num = max_num + 1
    new_teacher_id = f"T{new_id_num:03d}"
    
    teacher.teacher_id = new_teacher_id
    teacher.status = "ACTIVE"
    db.commit()
    db.refresh(teacher)
    return teacher

@router.put("/{id}/reject", response_model=TeacherResponse)
def reject_teacher(id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id, Teacher.status == "PENDING").first()
    if not teacher:
        raise ResourceNotFoundException("Pending Teacher", str(id))
    teacher.status = "INACTIVE"
    db.commit()
    db.refresh(teacher)
    return teacher

@router.put("/{id}/activate", response_model=TeacherResponse)
def activate_teacher(id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id).first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    teacher.status = "ACTIVE"
    db.commit()
    db.refresh(teacher)
    return teacher

@router.put("/{id}/deactivate", response_model=TeacherResponse)
def deactivate_teacher(id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id).first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    teacher.status = "INACTIVE"
    db.commit()
    db.refresh(teacher)
    return teacher

@router.get("/", response_model=List[TeacherResponse])
def list_teachers(db: Session = Depends(get_db)):
    teachers = db.query(Teacher).order_by(Teacher.name).all()
    return teachers

@router.get("/{id}", response_model=TeacherResponse)
def get_teacher(id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id).first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    return teacher

@router.put("/{id}", response_model=TeacherResponse)
def update_teacher(id: int, data: TeacherUpdate, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id).first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    
    if data.email:
        email_check = db.query(Teacher).filter(Teacher.email == data.email, Teacher.id != id).first()
        if email_check:
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
    
    db.commit()
    db.refresh(teacher)
    return teacher

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id).first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(id))
    db.delete(teacher)
    db.commit()
    return None

@router.get("/{teacher_id}/subjects", response_model=List[SubjectResponse])
def get_teacher_subjects(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(teacher_id))

    subjects = (
        db.query(Subject)
        .join(teacher_subjects, teacher_subjects.c.subject_id == Subject.id)
        .filter(teacher_subjects.c.teacher_id == teacher_id)
        .all()
    )
    return subjects

@router.post("/{teacher_id}/subjects", response_model=TeacherResponse)
def update_teacher_subjects(
    teacher_id: int,
    body: TeacherSubjectsUpdate,
    db: Session = Depends(get_db),
):
    db_teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not db_teacher:
        raise ResourceNotFoundException("Teacher", str(teacher_id))

    if body.subject_ids:
        subjects = db.query(Subject).filter(Subject.id.in_(body.subject_ids)).all()
        if len(subjects) != len(body.subject_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more subject IDs not found",
            )

    db.execute(
        teacher_subjects.delete().where(
            teacher_subjects.c.teacher_id == teacher_id
        )
    )
    for subject_id in body.subject_ids:
        db.execute(
            teacher_subjects.insert().values(
                teacher_id=teacher_id, subject_id=subject_id
            )
        )
    db.commit()

    db.refresh(db_teacher)
    return db_teacher

# ---------- Three‑Way Class‑Subject Management (replaces old two‑way) ----------
@router.get("/{teacher_id}/class-subjects", response_model=List[TeacherClassSubjectResponse])
def get_teacher_class_subjects(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise ResourceNotFoundException("Teacher", str(teacher_id))

    try:
        rows = (
            db.query(TeacherClassSubject, SchoolClass, Subject)
            .join(SchoolClass, TeacherClassSubject.class_id == SchoolClass.id)
            .join(Subject, TeacherClassSubject.subject_id == Subject.id)
            .filter(TeacherClassSubject.teacher_id == teacher_id)
            .all()
        )
    except Exception:
        # Fallback: if joins fail (orphaned rows), query without joins
        db.rollback()
        tcs_rows = db.query(TeacherClassSubject).filter(TeacherClassSubject.teacher_id == teacher_id).all()
        results = []
        for tcs in tcs_rows:
            sc = db.query(SchoolClass).filter(SchoolClass.id == tcs.class_id).first()
            sub = db.query(Subject).filter(Subject.id == tcs.subject_id).first()
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
def set_teacher_class_subjects(
    teacher_id: int,
    body: TeacherClassSubjectBatchCreate,
    db: Session = Depends(get_db)
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
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
        found_classes = set(db.scalars(select(SchoolClass.id).where(SchoolClass.id.in_(class_ids))).all())
        missing_classes = class_ids - found_classes
        if missing_classes:
            raise HTTPException(status_code=400, detail=f"Class IDs not found: {list(missing_classes)}")

    if subject_ids:
        found_subjects = set(db.scalars(select(Subject.id).where(Subject.id.in_(subject_ids))).all())
        missing_subjects = subject_ids - found_subjects
        if missing_subjects:
            raise HTTPException(status_code=400, detail=f"Subject IDs not found: {list(missing_subjects)}")

    # Replace all three‑way assignments for this teacher
    db.query(TeacherClassSubject).filter(TeacherClassSubject.teacher_id == teacher_id).delete()
    for item in unique.values():
        db.add(TeacherClassSubject(
            teacher_id=teacher_id,
            class_id=item.class_id,
            subject_id=item.subject_id
        ))

    db.commit()

    # Return the fresh list
    return get_teacher_class_subjects(teacher_id, db)