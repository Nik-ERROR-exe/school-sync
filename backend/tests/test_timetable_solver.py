import pytest
from app.services.timetable.models_internal import SolverInput, SolverTeacher, SolverClass, SolverRequirement
from app.services.timetable.solver import TimetableSolver
from app.core.exceptions import ValidationException

def test_timetable_solver_success():
    """
    Tests that the CSP timetable solver can successfully generate a schedule
    satisfying all constraints (PT limit, teacher daily limits, overlaps).
    """
    # 1. Mock inputs
    teachers = [
        SolverTeacher(id=1, name="Math Teacher", subject_expertise=[101], max_lectures_per_day=2),
        SolverTeacher(id=2, name="Science Teacher", subject_expertise=[102], max_lectures_per_day=2),
        SolverTeacher(id=3, name="PT Coach", subject_expertise=[103], max_lectures_per_day=3),
    ]
    
    classes = [
        SolverClass(id=1, class_name="8", division="A"),
        SolverClass(id=2, class_name="8", division="B"),
        SolverClass(id=3, class_name="9", division="A"),
    ]
    
    requirements = [
        # Class 1 requirements
        SolverRequirement(class_id=1, subject_id=101, periods_per_week=2),
        SolverRequirement(class_id=1, subject_id=103, periods_per_week=1),
        
        # Class 2 requirements
        SolverRequirement(class_id=2, subject_id=102, periods_per_week=2),
        SolverRequirement(class_id=2, subject_id=103, periods_per_week=1),
        
        # Class 3 requirements
        SolverRequirement(class_id=3, subject_id=101, periods_per_week=1),
        SolverRequirement(class_id=3, subject_id=102, periods_per_week=1),
        SolverRequirement(class_id=3, subject_id=103, periods_per_week=1),
    ]
    
    school_days = ["Monday", "Tuesday"]
    periods_per_day = 3
    lunch_period = 3  # Slot 3 is lunch (leaves slots 1 & 2 per day)
    pt_subject_id = 103
    
    solver_input = SolverInput(
        teachers=teachers,
        classes=classes,
        weekly_requirements=requirements,
        school_days=school_days,
        periods_per_day=periods_per_day,
        lunch_period=lunch_period,
        pt_subject_id=pt_subject_id
    )
    
    # 2. Run solver
    solver = TimetableSolver(solver_input)
    schedule = solver.solve()
    
    # 3. Assertions
    assert len(schedule) > 0, "Solver should return a non-empty schedule list"
    
    teacher_busy_slots = {}  # (day, period) -> set of teacher_ids
    class_busy_slots = set()  # (class_id, day, period)
    teacher_daily_counts = {}  # (teacher_id, day) -> count
    pt_slot_counts = {}  # (day, period) -> count of PT classes
    
    for slot in schedule:
        c_id = slot["class_id"]
        day = slot["day_of_week"]
        period = slot["period_number"]
        sub_id = slot["subject_id"]
        t_id = slot["teacher_id"]
        
        # Ignore lunch breaks
        assert period != lunch_period, "No lectures can be scheduled in the lunch period."
        
        # Ignore free/empty periods
        if sub_id == 0:
            continue
            
        # Constraint 2: Class cannot have different subjects at same period
        class_key = (c_id, day, period)
        assert class_key not in class_busy_slots, f"Class double booking at {day} Period {period}"
        class_busy_slots.add(class_key)
        
        # Constraint 1: A single teacher cannot have two overlapping lectures
        teacher_key = (day, period)
        if teacher_key not in teacher_busy_slots:
            teacher_busy_slots[teacher_key] = set()
        assert t_id not in teacher_busy_slots[teacher_key], f"Teacher {t_id} overlapping assignment at {day} Period {period}"
        teacher_busy_slots[teacher_key].add(t_id)
        
        # Constraint 3: No teacher exceeds daily limit
        daily_key = (t_id, day)
        teacher_daily_counts[daily_key] = teacher_daily_counts.get(daily_key, 0) + 1
        max_lectures = next(t.max_lectures_per_day for t in teachers if t.id == t_id)
        assert teacher_daily_counts[daily_key] <= max_lectures, f"Teacher {t_id} exceeded daily limit on {day}"
        
        # Constraint 4: PT ground capacity (max 2 classes)
        if sub_id == pt_subject_id:
            pt_key = (day, period)
            pt_slot_counts[pt_key] = pt_slot_counts.get(pt_key, 0) + 1
            assert pt_slot_counts[pt_key] <= 2, f"PT ground capacity limit exceeded at {day} Period {period}"

def test_timetable_solver_unsolvable():
    """
    Tests that the solver raises a ValidationException when constraints are too tight to solve.
    """
    teachers = [SolverTeacher(id=1, name="Teacher A", subject_expertise=[101], max_lectures_per_day=1)]
    classes = [SolverClass(id=1, class_name="8", division="A")]
    
    # Class needs 5 periods of Math, but only 1 day with 2 periods is available, and teacher only teaches 1 lecture per day
    requirements = [SolverRequirement(class_id=1, subject_id=101, periods_per_week=5)]
    
    solver_input = SolverInput(
        teachers=teachers,
        classes=classes,
        weekly_requirements=requirements,
        school_days=["Monday"],
        periods_per_day=3,
        lunch_period=3,  # Leaves periods 1 and 2 (max 2 slots)
        pt_subject_id=999
    )
    
    solver = TimetableSolver(solver_input)
    with pytest.raises(ValidationException):
        solver.solve()
