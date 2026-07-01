from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.api.deps import require_admin
from app.models.teacher import Teacher
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse

router = APIRouter(prefix="/admin/students", tags=["Admin - Students"])

@router.get("/", response_model=List[StudentResponse])
def list_students(
    class_id: Optional[int] = None,
    search: Optional[str] = None,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    if search:
        query = query.filter(
            Student.name.ilike(f"%{search}%") | 
            Student.roll_no.ilike(f"%{search}%")
        )
    return query.order_by(Student.roll_no).all()

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Student).filter(Student.roll_no == data.roll_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Roll number already exists")
    
    new_student = Student(
        roll_no=data.roll_no,
        name=data.name,
        class_id=data.class_id
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.put("/{id}", response_model=StudentResponse)
def update_student(
    id: int,
    data: StudentUpdate,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if data.roll_no:
        existing = db.query(Student).filter(
            Student.roll_no == data.roll_no,
            Student.id != id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Roll number already in use")
        student.roll_no = data.roll_no
    
    if data.name:
        student.name = data.name
    
    if data.class_id:
        student.class_id = data.class_id
    
    db.commit()
    db.refresh(student)
    return student

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    id: int,
    current_admin: Teacher = Depends(require_admin),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.delete(student)
    db.commit()
    return None