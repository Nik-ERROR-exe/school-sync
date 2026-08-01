import io

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.school_class import SchoolClass
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    BulkRowResult,
    StudentBulkUploadResponse,
)
from app.services.student_import_service import (
    parse_student_file,
    InvalidFileError,
    generate_student_template,
)

router = APIRouter(prefix="/admin/students", tags=["Admin - Students"])

MAX_UPLOAD_ROWS = 5000


def _clean_cell(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)  # xlsx may store "1" as 1.0
    return str(v).strip()


@router.get("/", response_model=List[StudentResponse])
def list_students(
    class_id: Optional[int] = None,
    search: Optional[str] = None,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Student)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    if search:
        query = query.filter(
            Student.name.ilike(f"%{search}%") | Student.roll_no.ilike(f"%{search}%")
        )
    return query.order_by(Student.roll_no).all()


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Check if roll_no already exists in the SAME class
    existing = db.query(Student).filter(
        Student.roll_no == data.roll_no,
        Student.class_id == data.class_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Roll number {data.roll_no} already exists in this class"
        )
    
    new_student = Student(
        roll_no=data.roll_no,
        name=data.name,
        class_id=data.class_id,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student


@router.post("/upload", response_model=StudentBulkUploadResponse)
def bulk_upload_students(
    file: UploadFile = File(...),
    default_class_id: Optional[int] = Form(None),
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db),
):
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        header_map, rows = parse_student_file(file.filename or "", content)
    except InvalidFileError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if len(rows) > MAX_UPLOAD_ROWS:
        raise HTTPException(
            status_code=400,
            detail=f"Too many rows ({len(rows)}). Maximum is {MAX_UPLOAD_ROWS}.",
        )
    if not rows:
        raise HTTPException(status_code=400, detail="The file contains no data rows.")
    if "roll_no" not in header_map or "name" not in header_map:
        raise HTTPException(
            status_code=400,
            detail="Missing required columns. Expected at least 'Roll No' and 'Name'.",
        )

    # Resolve default class (fallback target for rows without Class/Division).
    default_class = None
    if default_class_id is not None:
        default_class = db.query(SchoolClass).filter(
            SchoolClass.id == default_class_id
        ).first()
        if default_class is None:
            raise HTTPException(
                status_code=400, detail="Selected default class does not exist."
            )

    # Class lookup by (class_name, division), case-insensitive.
    class_lookup = {
        (c.class_name.strip().lower(), c.division.strip().lower()): c.id
        for c in db.query(SchoolClass).all()
    }

    # Phase 1: validate + resolve class_id per row.
    pending = []  # (row_number, roll_no, name, class_id)
    results: List[BulkRowResult] = []
    for i, raw in enumerate(rows, start=1):
        roll_no = _clean_cell(raw.get("roll_no"))
        name = _clean_cell(raw.get("name"))
        class_name = _clean_cell(raw.get("class_name"))
        division = _clean_cell(raw.get("division"))

        reason = None
        if not roll_no:
            reason = "Missing roll number."
        elif not name:
            reason = "Missing name."
        elif len(roll_no) > 50:
            reason = "Roll number exceeds 50 characters."
        elif len(name) > 100:
            reason = "Name exceeds 100 characters."
        elif class_name or division:
            # A row that names a class must name BOTH Class and Division.
            if not (class_name and division):
                reason = (
                    "Incomplete class: provide both Class and Division, "
                    "or leave both blank to use the default class."
                )
            else:
                class_id = class_lookup.get(
                    (class_name.lower(), division.lower())
                )
                if class_id is None:
                    reason = f"Class not found: '{class_name}' / '{division}'."
                else:
                    pending.append((i, roll_no, name, class_id))
        elif default_class is None:
            reason = "No default class selected and row has no Class/Division."
        else:
            pending.append((i, roll_no, name, default_class.id))

        if reason:
            results.append(BulkRowResult(
                row_number=i,
                roll_no=roll_no or None,
                name=name or None,
                status="skipped",
                reason=reason,
            ))

    # Phase 2: batch-load existing (class_id, roll_no) pairs for touched classes.
    class_ids = {cid for _, _, _, cid in pending}
    existing_pairs = set()
    if class_ids:
        existing_pairs = {
            (cid, rno)
            for cid, rno in db.query(Student.class_id, Student.roll_no)
            .filter(Student.class_id.in_(class_ids))
            .all()
        }

    # Phase 3: duplicate detection (in-file first, then DB) + build insert list.
    seen_first = {}  # (class_id, roll_no) -> first row number
    to_insert = []
    for i, roll_no, name, class_id in pending:
        key = (class_id, roll_no)
        first = seen_first.get(key)
        if first is not None:
            results.append(BulkRowResult(
                row_number=i,
                roll_no=roll_no,
                name=name,
                status="skipped",
                reason=f"Duplicate within file (first seen at row {first}).",
            ))
        elif key in existing_pairs:
            results.append(BulkRowResult(
                row_number=i,
                roll_no=roll_no,
                name=name,
                status="skipped",
                reason="Roll number already exists in this class.",
            ))
        else:
            seen_first[key] = i
            existing_pairs.add(key)
            to_insert.append(Student(roll_no=roll_no, name=name, class_id=class_id))
            results.append(BulkRowResult(
                row_number=i,
                roll_no=roll_no,
                name=name,
                status="inserted",
            ))

    if to_insert:
        db.add_all(to_insert)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="A roll number conflicts with an existing student "
                       "(concurrent change). No rows were saved.",
            )

    return StudentBulkUploadResponse(
        total_rows=len(rows),
        inserted=len(to_insert),
        skipped=len(results) - len(to_insert),
        results=results,
    )


@router.get("/template")
def download_student_template(current_admin: Teacher = Depends(require_admin)):
    data = generate_student_template()
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="student_upload_template.xlsx"'
        },
    )


@router.put("/{id}", response_model=StudentResponse)
def update_student(
    id: int,
    data: StudentUpdate,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if data.roll_no:
        # Check if roll_no already exists in the SAME class (excluding current student)
        existing = db.query(Student).filter(
            Student.roll_no == data.roll_no,
            Student.class_id == student.class_id,
            Student.id != id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Roll number {data.roll_no} already exists in this class"
            )
        student.roll_no = data.roll_no

    if data.name is not None:
        student.name = data.name
    
    if data.class_id:
        # If class is changing, check if roll_no exists in the new class
        new_class_id = data.class_id
        roll_no_to_check = data.roll_no if data.roll_no else student.roll_no
        
        existing = db.query(Student).filter(
            Student.roll_no == roll_no_to_check,
            Student.class_id == new_class_id,
            Student.id != id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Roll number {roll_no_to_check} already exists in the new class"
            )
        student.class_id = data.class_id

    db.commit()
    db.refresh(student)
    return student


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    id: int,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(student)
    db.commit()
    return None