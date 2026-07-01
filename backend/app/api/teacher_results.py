from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.api.deps import get_current_user
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.result import Result
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.school_class import SchoolClass
from app.models.subject import Subject

router = APIRouter(prefix="/teacher/results", tags=["Teacher - Results"])

def calculate_grade(percentage: float) -> str:
    if percentage >= 90: return "A+"
    elif percentage >= 80: return "A"
    elif percentage >= 70: return "B"
    elif percentage >= 60: return "C"
    elif percentage >= 50: return "D"
    else: return "F"


@router.post("/submit")
def submit_results(
    data: dict,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit marks for approval (final submission).
    Converts pending (draft) results to submitted status.
    """
    class_id = data.get("class_id")
    exam_type_id = data.get("exam_type_id")
    total_marks = data.get("total_marks", 100)
    marks_data = data.get("marks", [])
    
    if not class_id or not exam_type_id:
        raise HTTPException(status_code=400, detail="Class ID and Exam Type are required")
    
    if not marks_data:
        raise HTTPException(status_code=400, detail="No marks data provided")
    
    class_obj = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    submitted_count = 0
    
    for mark in marks_data:
        student_id = mark.get("student_id")
        subject_id = mark.get("subject_id")
        marks_obtained = mark.get("marks_obtained", 0)
        
        percentage = (marks_obtained / total_marks) * 100
        grade = calculate_grade(percentage)
        
        # Find pending result (draft) from this teacher
        existing = db.query(Result).filter(
            Result.student_id == student_id,
            Result.subject_id == subject_id,
            Result.exam_type_id == exam_type_id,
            Result.submitted_by_id == current_teacher.id,
            Result.status == "pending"
        ).first()
        
        if existing:
            # Update pending to submitted
            existing.marks_obtained = marks_obtained
            existing.total_marks = total_marks
            existing.percentage = percentage
            existing.grade = grade
            existing.status = "submitted"
            existing.class_id = class_id
            existing.submitted_at = datetime.utcnow()
            submitted_count += 1
        else:
            # Check if already submitted/approved by anyone
            existing_result = db.query(Result).filter(
                Result.student_id == student_id,
                Result.subject_id == subject_id,
                Result.exam_type_id == exam_type_id
            ).first()
            
            if existing_result and existing_result.status in ["submitted", "approved"]:
                continue
            
            # Create new submitted result (direct submit without save)
            new_result = Result(
                student_id=student_id,
                subject_id=subject_id,
                exam_type_id=exam_type_id,
                class_id=class_id,
                marks_obtained=marks_obtained,
                total_marks=total_marks,
                percentage=percentage,
                grade=grade,
                status="submitted",
                submitted_by_id=current_teacher.id,
                submitted_at=datetime.utcnow()
            )
            db.add(new_result)
            submitted_count += 1
    
    db.commit()
    
    return {
        "message": f"Submitted {submitted_count} results for approval",
        "submitted_count": submitted_count,
        "status": "submitted"
    }


@router.post("/save")
def save_results_draft(
    data: dict,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save marks as pending (draft). Only the teacher who saved can see these.
    Uses existing 'pending' status - NO DATABASE CHANGES NEEDED.
    """
    try:
        class_id = data.get("class_id")
        exam_type_id = data.get("exam_type_id")
        total_marks = data.get("total_marks", 100)
        marks_data = data.get("marks", [])
        
        if not class_id or not exam_type_id:
            raise HTTPException(status_code=400, detail="Class ID and Exam Type are required")
        
        if not marks_data:
            raise HTTPException(status_code=400, detail="No marks data provided")
        
        class_obj = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
        
        saved_count = 0
        updated_count = 0
        skipped_count = 0
        
        for mark in marks_data:
            student_id = mark.get("student_id")
            subject_id = mark.get("subject_id")
            marks_obtained = mark.get("marks_obtained", 0)
            
            # Validate student and subject exist
            student = db.query(Student).filter(Student.id == student_id).first()
            if not student:
                skipped_count += 1
                continue
            
            subject = db.query(Subject).filter(Subject.id == subject_id).first()
            if not subject:
                skipped_count += 1
                continue
            
            percentage = (marks_obtained / total_marks) * 100
            grade = calculate_grade(percentage)
            
            # Check if pending result already exists for this teacher
            existing = db.query(Result).filter(
                Result.student_id == student_id,
                Result.subject_id == subject_id,
                Result.exam_type_id == exam_type_id,
                Result.submitted_by_id == current_teacher.id,
                Result.status == "pending"
            ).first()
            
            if existing:
                # Update existing pending
                existing.marks_obtained = marks_obtained
                existing.total_marks = total_marks
                existing.percentage = percentage
                existing.grade = grade
                existing.class_id = class_id
                updated_count += 1
            else:
                # Check if already submitted/approved by anyone
                submitted = db.query(Result).filter(
                    Result.student_id == student_id,
                    Result.subject_id == subject_id,
                    Result.exam_type_id == exam_type_id,
                    Result.status.in_(["submitted", "approved"])
                ).first()
                
                if submitted:
                    skipped_count += 1
                    continue
                
                # Create new pending (draft)
                new_result = Result(
                    student_id=student_id,
                    subject_id=subject_id,
                    exam_type_id=exam_type_id,
                    class_id=class_id,
                    marks_obtained=marks_obtained,
                    total_marks=total_marks,
                    percentage=percentage,
                    grade=grade,
                    status="pending",
                    submitted_by_id=current_teacher.id
                )
                db.add(new_result)
                saved_count += 1
        
        db.commit()
        
        return {
            "message": f"Saved {saved_count} marks as draft, updated {updated_count} existing, skipped {skipped_count} (already submitted/approved)",
            "saved_count": saved_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Save error: {str(e)}")  # Log to console for debugging
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/auto-save")
def auto_save_mark(
    data: dict,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Auto-save a single mark when teacher types.
    """
    student_id = data.get("student_id")
    subject_id = data.get("subject_id")
    exam_type_id = data.get("exam_type_id")
    class_id = data.get("class_id")
    marks_obtained = data.get("marks_obtained", 0)
    total_marks = data.get("total_marks", 100)
    
    if not all([student_id, subject_id, exam_type_id, class_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    percentage = (marks_obtained / total_marks) * 100
    grade = calculate_grade(percentage)
    
    # Check if pending result exists for this teacher
    existing = db.query(Result).filter(
        Result.student_id == student_id,
        Result.subject_id == subject_id,
        Result.exam_type_id == exam_type_id,
        Result.submitted_by_id == current_teacher.id,
        Result.status == "pending"
    ).first()
    
    if existing:
        # Update existing pending
        existing.marks_obtained = marks_obtained
        existing.total_marks = total_marks
        existing.percentage = percentage
        existing.grade = grade
        existing.class_id = class_id
    else:
        # Check if already submitted/approved
        submitted = db.query(Result).filter(
            Result.student_id == student_id,
            Result.subject_id == subject_id,
            Result.exam_type_id == exam_type_id,
            Result.status.in_(["submitted", "approved"])
        ).first()
        
        if submitted:
            return {"message": "Result already submitted/approved", "status": submitted.status}
        
        # Create new pending
        new_result = Result(
            student_id=student_id,
            subject_id=subject_id,
            exam_type_id=exam_type_id,
            class_id=class_id,
            marks_obtained=marks_obtained,
            total_marks=total_marks,
            percentage=percentage,
            grade=grade,
            status="pending",
            submitted_by_id=current_teacher.id
        )
        db.add(new_result)
    
    db.commit()
    return {"message": "Mark saved", "status": "pending"}


@router.get("/class/{class_id}/exam/{exam_type_id}")
def get_results_by_class_and_exam(
    class_id: int,
    exam_type_id: int,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get ALL results (pending + submitted + approved) for a class and exam.
    Returns marks as {student_id_subject_id: marks_obtained}
    """
    results = db.query(Result).filter(
        Result.class_id == class_id,
        Result.exam_type_id == exam_type_id
    ).all()
    
    marks_dict = {}
    for result in results:
        key = f"{result.student_id}_{result.subject_id}"
        marks_dict[key] = result.marks_obtained
    
    return marks_dict


@router.get("/pending/class/{class_id}/exam/{exam_type_id}")
def get_pending_results(
    class_id: int,
    exam_type_id: int,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get pending (draft) results saved by this teacher.
    """
    results = db.query(Result).filter(
        Result.class_id == class_id,
        Result.exam_type_id == exam_type_id,
        Result.submitted_by_id == current_teacher.id,
        Result.status == "pending"
    ).all()
    
    marks_dict = {}
    for result in results:
        key = f"{result.student_id}_{result.subject_id}"
        marks_dict[key] = result.marks_obtained
    
    return marks_dict