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

    # Debug logging
    print(f"🔍 Auto-save received: student={student_id}, subject={subject_id}, exam={exam_type_id}, class={class_id}, marks={marks_obtained}, teacher={current_teacher.id}")

    if not all([student_id, subject_id, exam_type_id, class_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    percentage = (marks_obtained / total_marks) * 100
    grade = calculate_grade(percentage)

    # Try to find existing pending result for this teacher, student, subject, exam
    existing = db.query(Result).filter(
        Result.student_id == student_id,
        Result.subject_id == subject_id,
        Result.exam_type_id == exam_type_id,
        Result.submitted_by_id == current_teacher.id,
        Result.status == "pending"
    ).first()

    if existing:
        print(f"✅ Found existing pending result ID={existing.id}, updating to {marks_obtained}")
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
            print(f"⚠️ Result already submitted/approved for student {student_id}, subject {subject_id}, skipping update")
            return {"message": "Result already submitted/approved", "status": submitted.status}

        # Check if there is a pending record with a different teacher (should not happen)
        other_pending = db.query(Result).filter(
            Result.student_id == student_id,
            Result.subject_id == subject_id,
            Result.exam_type_id == exam_type_id,
            Result.status == "pending"
        ).first()
        if other_pending:
            print(f"⚠️ Another teacher's pending result exists for student {student_id}, subject {subject_id}. Overwriting?")
            # Optionally update it, but for now we'll create a new one with this teacher's ID.
            # But that would be wrong; we should probably not create a duplicate.
            # Instead, we can update the existing one and change submitted_by_id.
            # Let's update it to this teacher.
            other_pending.submitted_by_id = current_teacher.id
            other_pending.marks_obtained = marks_obtained
            other_pending.total_marks = total_marks
            other_pending.percentage = percentage
            other_pending.grade = grade
            other_pending.class_id = class_id
            db.commit()
            print(f"✅ Claimed other teacher's pending result ID={other_pending.id}")
            return {"message": "Mark saved", "status": "pending"}

        # Create new pending
        print(f"🆕 Creating new pending result for student {student_id}, subject {subject_id}")
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
    print("✅ Auto-save committed")
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


# ============================================================
# NEW ENDPOINT: Get results with status for teacher (for frontend)
# ============================================================
@router.get("/with-status/class/{class_id}/exam/{exam_type_id}")
def get_results_with_status(
    class_id: int,
    exam_type_id: int,
    current_teacher: Teacher = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all results for a class and exam with full status info.
    Returns students with their subjects and result details (including status and result_id).
    This is used by the teacher frontend to display editable/disabled fields.
    """
    # Get all students in the class
    students = db.query(Student).filter(Student.class_id == class_id).order_by(Student.roll_no).all()
    
    # Get all subjects for this class and exam (subjects that have results or are assigned)
    # We'll get subjects from the results table for this class/exam.
    subjects = db.query(Subject).join(
        Result, Result.subject_id == Subject.id
    ).filter(
        Result.class_id == class_id,
        Result.exam_type_id == exam_type_id
    ).distinct().order_by(Subject.subject_name).all()
    
    # Get all results for this class and exam
    results = db.query(Result).filter(
        Result.class_id == class_id,
        Result.exam_type_id == exam_type_id
    ).all()
    
    # Build response
    response_data = []
    for student in students:
        student_data = {
            "student_id": student.id,
            "roll_no": student.roll_no,
            "name": student.name,
            "subjects": []
        }
        
        # For each subject, find the result (if any) for this student
        for subject in subjects:
            result = next(
                (r for r in results if r.student_id == student.id and r.subject_id == subject.id),
                None
            )
            
            student_data["subjects"].append({
                "subject_id": subject.id,
                "subject_name": subject.subject_name,
                "marks_obtained": result.marks_obtained if result else None,
                "total_marks": result.total_marks if result else None,
                "percentage": result.percentage if result else None,
                "grade": result.grade if result else None,
                "status": result.status if result else None,  # 'pending', 'submitted', 'approved', or None
                "result_id": result.id if result else None
            })
        
        response_data.append(student_data)
    
    return {
        "class_id": class_id,
        "exam_type_id": exam_type_id,
        "students": response_data,
        "subjects": [{"id": s.id, "name": s.subject_name} for s in subjects]
    }