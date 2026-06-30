from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database import get_db
from app.api.deps import require_admin
from app.models.student import Student
from app.models.school_class import SchoolClass
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse, StudentListResponse
from app.core.exceptions import ResourceNotFoundException, ConflictException

router = APIRouter(
    prefix="/admin/students",
    tags=["Admin - Student Management"],
    dependencies=[Depends(require_admin)]
)

@router.get("/classes", response_model=List[dict])
def get_all_classes(
    db: Session = Depends(get_db),
    admin = Depends(require_admin)
):
    """Get all classes for dropdown"""
    classes = db.query(SchoolClass).order_by(SchoolClass.class_name, SchoolClass.division).all()
    return [
        {
            "id": cls.id,
            "class_name": cls.class_name,
            "division": cls.division
        }
        for cls in classes
    ]

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db)
):
    """Add a new student"""
    # Check if class exists
    class_exists = db.query(SchoolClass).filter(SchoolClass.id == data.class_id).first()
    if not class_exists:
        raise ResourceNotFoundException("Class", str(data.class_id))
    
    # Check if roll_no already exists
    existing = db.query(Student).filter(Student.roll_no == data.roll_no).first()
    if existing:
        raise ConflictException(f"Student with roll number '{data.roll_no}' already exists")
    
    student = Student(
        roll_no=data.roll_no,
        name=data.name,
        class_id=data.class_id
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.get("/", response_model=StudentListResponse)
def list_students(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List all students with pagination and filters"""
    query = db.query(Student)
    
    if search:
        query = query.filter(
            or_(
                Student.name.ilike(f"%{search}%"),
                Student.roll_no.ilike(f"%{search}%")
            )
        )
    
    if class_id:
        query = query.filter(Student.class_id == class_id)
    
    total = query.count()
    offset = (page - 1) * per_page
    students = query.offset(offset).limit(per_page).order_by(Student.roll_no).all()
    
    return StudentListResponse(
        students=students,
        total=total,
        page=page,
        per_page=per_page
    )

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Delete a student"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise ResourceNotFoundException("Student", str(student_id))
    
    db.delete(student)
    db.commit()
    return None