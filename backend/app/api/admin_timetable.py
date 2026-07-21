from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, text, inspect
from sqlalchemy.future import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import require_admin
from app.schemas.timetable import TimetableGenerateRequest, TimetableResponse, TimetableSaveRequest
from app.services.timetable import (
    SolverInput,
    SolverTeacher,
    SolverClass,
    SolverRequirement,
    SolverSlot,
    TimetableSolver,
    validate_timetable_slots
)
from app.models.timetable import TimetableSlot
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.weekly_requirement import WeeklyRequirement
from app.models.teacher_class_subject import TeacherClassSubject
from app.core.exceptions import ValidationException

router = APIRouter(
    prefix="/admin/timetable",
    tags=["Admin - Timetable Management"],
    dependencies=[Depends(require_admin)]
)

@router.get("/")
def get_timetable(db: Session = Depends(get_db)):
    """Get the current saved timetable"""
    slots = db.query(TimetableSlot).all()
    
    schedule = []
    for slot in slots:
        schedule.append({
            "class_id": slot.class_id,
            "day_of_week": slot.day_of_week,
            "period_number": slot.period_number,
            "subject_id": slot.subject_id,
            "teacher_id": slot.teacher_id,
        })
    
    return {
        "schedule": schedule,
        "success": True,
        "message": f"Timetable loaded successfully. {len(schedule)} slots found."
    }

@router.get("/test")
def test_timetable():
    return {"message": "Timetable router is working!", "success": True}

@router.post("/generate", response_model=TimetableResponse)
def generate_timetable(
    req: TimetableGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Generates timetable using teacher_class_subjects mapping.
    Teachers are assigned per class-subject combination.
    """
    # --- 1. Load Teachers with their class-subject mappings ---
    if req.teachers is not None:
        # Use provided teachers
        solver_teachers = [
            SolverTeacher(
                id=t.id,
                name=t.name,
                subject_expertise=t.subject_expertise if hasattr(t, 'subject_expertise') else [],
                max_lectures_per_day=t.max_lectures_per_day,
                availability=t.availability if hasattr(t, 'availability') else None
            ) for t in req.teachers
        ]
    else:
        # Load teachers and their class-subject mappings from database
        db_teachers = db.execute(
            select(Teacher).where(Teacher.status == "ACTIVE")
        ).scalars().all()

        if not db_teachers:
            raise ValidationException("No active teachers found in the database. Create teachers first.")

        # Build teacher_class_subject mapping for solver
        # Key: (class_id, subject_id) -> list of teacher_ids
        class_subject_teachers = {}
        mappings = db.execute(
            select(TeacherClassSubject)
            .where(TeacherClassSubject.teacher_id.isnot(None))
        ).scalars().all()
        
        for mapping in mappings:
            key = (mapping.class_id, mapping.subject_id)
            if key not in class_subject_teachers:
                class_subject_teachers[key] = []
            class_subject_teachers[key].append(mapping.teacher_id)

        solver_teachers = []
        for teacher in db_teachers:
            # Get subjects this teacher teaches for ANY class (for global solver)
            subject_ids = db.execute(
                select(TeacherClassSubject.subject_id)
                .where(TeacherClassSubject.teacher_id == teacher.id)
            ).scalars().all()
            
            solver_teachers.append(
                SolverTeacher(
                    id=teacher.id,
                    name=teacher.name,
                    subject_expertise=list(set(subject_ids)),  # Unique subjects
                    max_lectures_per_day=teacher.max_lectures_per_day,
                    availability=None
                )
            )

    # --- 2. Resolve Classes ---
    if req.classes is not None:
        solver_classes = [
            SolverClass(id=c.id, class_name=c.class_name, division=c.division)
            for c in req.classes
        ]
    else:
        stmt = select(SchoolClass)
        result = db.execute(stmt)
        db_classes = list(result.scalars().all())

        if not db_classes:
            raise ValidationException("No classes found in the database. Create classes first.")

        solver_classes = [
            SolverClass(id=c.id, class_name=c.class_name, division=c.division)
            for c in db_classes
        ]

    generating_class_ids = [c.id for c in solver_classes]

    # --- 3. Resolve Weekly Requirements ---
    if req.weekly_requirements is not None and len(req.weekly_requirements) > 0:
        solver_reqs = [
            SolverRequirement(class_id=r.class_id, subject_id=r.subject_id, periods_per_week=r.periods_per_week)
            for r in req.weekly_requirements
        ]
    else:
        stmt = select(WeeklyRequirement).where(WeeklyRequirement.class_id.in_(generating_class_ids))
        result = db.execute(stmt)
        db_reqs = result.scalars().all()

        if db_reqs:
            solver_reqs = [
                SolverRequirement(class_id=r.class_id, subject_id=r.subject_id, periods_per_week=r.periods_per_week)
                for r in db_reqs
            ]
        else:
            inspector = inspect(db.get_bind())
            if inspector.has_table("class_subjects"):
                sql = text("""
                    SELECT class_id, subject_id
                    FROM class_subjects
                    WHERE class_id IN :class_ids
                """)
                result = db.execute(sql, {"class_ids": tuple(generating_class_ids)})
                class_subjects = result.fetchall()

                if class_subjects:
                    solver_reqs = [
                        SolverRequirement(
                            class_id=row[0],
                            subject_id=row[1],
                            periods_per_week=1
                        )
                        for row in class_subjects
                    ]
                else:
                    raise ValidationException(
                        "No subjects assigned to any of the selected classes in class_subjects."
                    )
            else:
                raise ValidationException(
                    "No weekly requirements found and class_subjects table does not exist."
                )

    # --- 4. Load existing slots for other classes ---
    existing_slots_db = db.execute(
        select(TimetableSlot).where(TimetableSlot.class_id.notin_(generating_class_ids))
    ).scalars().all()

    solver_existing_slots = [
        SolverSlot(
            class_id=s.class_id,
            day_of_week=s.day_of_week,
            period_number=s.period_number,
            subject_id=s.subject_id,
            teacher_id=s.teacher_id
        )
        for s in existing_slots_db
    ]

    # --- 5. Build solver input with class-subject-teacher mapping ---
    solver_input = SolverInput(
        teachers=solver_teachers,
        classes=solver_classes,
        weekly_requirements=solver_reqs,
        school_days=req.school_days,
        periods_per_day=req.periods_per_day,
        lunch_period=req.lunch_period,
        pt_subject_id=req.pt_subject_id,
        existing_slots=solver_existing_slots,
        class_subject_teachers=class_subject_teachers  # Pass mapping to solver
    )

    solver = TimetableSolver(solver_input)
    schedule = solver.solve()

    # --- 6. Save to database ---
    try:
        db.execute(
            delete(TimetableSlot).where(TimetableSlot.class_id.in_(generating_class_ids))
        )
        
        for slot in schedule:
            db_slot = TimetableSlot(
                class_id=slot.class_id,
                day_of_week=slot.day_of_week,
                period_number=slot.period_number,
                subject_id=slot.subject_id,
                teacher_id=slot.teacher_id
            )
            db.add(db_slot)
        
        db.commit()
        print(f"✅ Saved {len(schedule)} timetable slots to database")
        
    except Exception as e:
        db.rollback()
        raise ValidationException(f"Failed to save timetable: {str(e)}")

    return {
        "schedule": schedule,
        "success": True,
        "message": f"Timetable generated successfully. {len(schedule)} slots created."
    }

@router.put("/", response_model=TimetableResponse)
def save_timetable(
    req: TimetableSaveRequest,
    pt_subject_id: int = Query(..., description="ID representing Physical Training (PT)"),
    db: Session = Depends(get_db)
):
    teachers_res = db.execute(select(Teacher))
    teachers_list = list(teachers_res.scalars().all())

    validate_timetable_slots(req.slots, teachers_list, pt_subject_id)

    new_slots = [
        TimetableSlot(
            class_id=s.class_id,
            day_of_week=s.day_of_week,
            period_number=s.period_number,
            subject_id=s.subject_id,
            teacher_id=s.teacher_id
        )
        for s in req.slots
        if s.subject_id > 0 and s.teacher_id > 0
    ]

    try:
        db.execute(delete(TimetableSlot))
        db.add_all(new_slots)
        db.flush()
        db.commit()
    except Exception as e:
        db.rollback()
        raise ValidationException(
            f"Failed to save timetable due to a database constraint violation: {str(e)}"
        )

    return {
        "schedule": req.slots,
        "success": True,
        "message": "Timetable saved successfully."
    }