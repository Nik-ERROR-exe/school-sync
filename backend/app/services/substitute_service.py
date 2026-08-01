from datetime import date as pydate, datetime
from typing import List, Optional, Tuple, Any
from sqlalchemy import func, or_, delete
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, Session
from app.models.teacher import Teacher
from app.models.timetable import TimetableSlot
from app.models.substitute_assignment import SubstituteAssignment
from app.models.school_class import SchoolClass
from app.schemas.substitute import (
    AvailableTeacherResponse,
    AffectedPeriodResponse,
    SubstituteAssignmentResponse,
    TeacherListResponse,
    FutureSubstituteAssignRequest,
)
from app.core.date_utils import day_to_int, int_to_day
from app.core.exceptions import ValidationException, ResourceNotFoundException
from app.services.notification_service import send_notification_email


def get_all_assignments(db: Session) -> List[SubstituteAssignmentResponse]:
    """Returns all substitute assignments ordered by date descending."""
    stmt = (
        select(SubstituteAssignment)
        .options(
            joinedload(SubstituteAssignment.school_class),
            joinedload(SubstituteAssignment.subject),
            joinedload(SubstituteAssignment.original_teacher),
            joinedload(SubstituteAssignment.substitute_teacher)
        )
        .order_by(SubstituteAssignment.date.desc(), SubstituteAssignment.period_number)
    )
    assignments = db.execute(stmt).scalars().all()

    return [
        SubstituteAssignmentResponse(
            id=a.id,
            date=a.date,
            period_number=a.period_number,
            class_id=a.class_id,
            subject_id=a.subject_id,
            class_name=a.school_class.class_name,
            division=a.school_class.division,
            subject_name=a.subject.subject_name if a.subject else None,
            original_teacher_id=a.original_teacher_id,
            original_teacher_name=a.original_teacher.name,
            substitute_teacher_id=a.substitute_teacher_id,
            substitute_teacher_name=a.substitute_teacher.name,
            status=a.status
        )
        for a in assignments
    ]


def get_active_teachers(db: Session) -> List[TeacherListResponse]:
    """Returns all active teachers for the absent teacher dropdown."""
    stmt = select(Teacher).where(Teacher.status == "ACTIVE").order_by(Teacher.name)
    teachers = db.execute(stmt).scalars().all()

    return [
        TeacherListResponse(
            id=t.id,
            teacher_id=t.teacher_id,
            name=t.name,
            email=t.email,
            status=t.status
        )
        for t in teachers
    ]


def get_affected_periods(
    db: Session,
    absent_date: pydate,
    absent_teacher_id: int
) -> List[AffectedPeriodResponse]:
    """
    Returns all periods in the master timetable where the absent teacher is scheduled on
    the given day-of-week, showing class and subject details.
    Only returns periods for dates >= current date.
    """
    # Only consider future dates (today and onwards)
    today = datetime.now().date()
    if absent_date < today:
        raise ValidationException("Cannot assign substitutes for past dates.")

    day_int = day_to_int(absent_date.strftime("%A"))

    stmt = (
        select(TimetableSlot)
        .options(
            joinedload(TimetableSlot.school_class),
            joinedload(TimetableSlot.subject)
        )
        .where(
            TimetableSlot.teacher_id == absent_teacher_id,
            TimetableSlot.day_of_week == day_int
        )
        .order_by(TimetableSlot.period_number)
    )
    slots = db.execute(stmt).scalars().all()

    results = []
    for slot in slots:
        # skip periods that already have a substitute assigned
        existing = db.execute(
            select(SubstituteAssignment).where(
                SubstituteAssignment.date == absent_date,
                SubstituteAssignment.period_number == slot.period_number,
                SubstituteAssignment.original_teacher_id == absent_teacher_id
            )
        ).scalar_one_or_none()
        if existing:
            continue

        results.append(
            AffectedPeriodResponse(
                class_id=slot.class_id,
                class_name=slot.school_class.class_name,
                division=slot.school_class.division,
                subject_id=slot.subject_id,
                subject_name=slot.subject.subject_name if slot.subject else None,
                period_number=slot.period_number
            )
        )

    return results

def find_available_substitutes(
    db: Session,
    absent_date: pydate,
    period_number: int,
    absent_teacher_id: int
) -> Tuple[Optional[TimetableSlot], List[AvailableTeacherResponse]]:
    """
    Finds the class requiring a substitute for the absent teacher at the given period and date,
    then identifies eligible substitute teachers who are free and haven't reached their daily limit.
    Teachers with matching subject expertise are prioritized.
    """
    day_int = day_to_int(absent_date.strftime("%A"))  # 1..7 stored in DB

    # 1. Fetch the master timetable slot that needs substitution
    slot_stmt = select(TimetableSlot).options(
        joinedload(TimetableSlot.school_class),
        joinedload(TimetableSlot.subject)
    ).where(
        TimetableSlot.teacher_id == absent_teacher_id,
        TimetableSlot.day_of_week == day_int,
        TimetableSlot.period_number == period_number
    )

    slot_res = db.execute(slot_stmt)
    slot_to_sub = slot_res.scalar_one_or_none()

    if not slot_to_sub:
        return None, []

    subject_id = slot_to_sub.subject_id

    # 2. Query other ACTIVE teachers who can serve as candidates
    teachers_stmt = select(Teacher).where(
        Teacher.id != absent_teacher_id,
        Teacher.status == "ACTIVE"
    )
    teachers_res = db.execute(teachers_stmt)
    candidates = teachers_res.scalars().all()

    available_teachers = []

    for candidate in candidates:
        # Check if they are teaching in the master timetable at this exact time
        master_slot_stmt = select(TimetableSlot).where(
            TimetableSlot.teacher_id == candidate.id,
            TimetableSlot.day_of_week == day_int,
            TimetableSlot.period_number == period_number
        )
        master_slot = db.execute(master_slot_stmt).scalar_one_or_none()

        # Check if they are already subbing in another class at this exact time
        sub_slot_stmt = select(SubstituteAssignment).where(
            SubstituteAssignment.substitute_teacher_id == candidate.id,
            SubstituteAssignment.date == absent_date,
            SubstituteAssignment.period_number == period_number
        )
        is_subbing = db.execute(sub_slot_stmt).scalar_one_or_none() is not None

        # If they have a timetable class OR are subbing, they are busy
        if master_slot or is_subbing:
            continue

        # Check subject expertise
        has_subject_expertise = False
        if subject_id and candidate.subjects_expertise:
            has_subject_expertise = any(s.id == subject_id for s in candidate.subjects_expertise)

        # Compute their current total lecture load on this date:
        # Lectures = (Master slots on this day) - (Absences on this date) + (Substitutions on this date)

        # a. Master slots
        master_count_stmt = select(func.count(TimetableSlot.id)).where(
            TimetableSlot.teacher_id == candidate.id,
            TimetableSlot.day_of_week == day_int
        )
        master_count = db.execute(master_count_stmt).scalar() or 0

        # b. Absences on this date
        absences_count_stmt = select(func.count(SubstituteAssignment.id)).where(
            SubstituteAssignment.original_teacher_id == candidate.id,
            SubstituteAssignment.date == absent_date
        )
        absences_count = db.execute(absences_count_stmt).scalar() or 0

        # c. Substitutions on this date
        subs_count_stmt = select(func.count(SubstituteAssignment.id)).where(
            SubstituteAssignment.substitute_teacher_id == candidate.id,
            SubstituteAssignment.date == absent_date
        )
        subs_count = db.execute(subs_count_stmt).scalar() or 0

        actual_lectures = master_count - absences_count + subs_count

        if actual_lectures < candidate.max_lectures_per_day:
            available_teachers.append(
                AvailableTeacherResponse(
                    id=candidate.id,
                    teacher_id=candidate.teacher_id or str(candidate.id),
                    name=candidate.name,
                    email=candidate.email,
                    max_lectures_per_day=candidate.max_lectures_per_day,
                    current_lectures_on_date=actual_lectures,
                    has_subject_expertise=has_subject_expertise
                )
            )

    # Sort: teachers with subject expertise first, then by fewer current lectures
    available_teachers.sort(key=lambda t: (-t.has_subject_expertise, t.current_lectures_on_date))

    return slot_to_sub, available_teachers

def assign_substitute(
    db: Session,
    date: pydate,
    period_number: int,
    class_id: int,
    subject_id: int,
    original_teacher_id: int,
    substitute_teacher_id: int,
    background_tasks: Optional[Any] = None
) -> SubstituteAssignment:
    """
    Creates a substitute assignment, writes it to the database, and fires a notification
    to the chosen substitute teacher.
    """
    # Verify candidate is not already assigned as a sub for this period
    existing_sub_stmt = select(SubstituteAssignment).where(
        SubstituteAssignment.date == date,
        SubstituteAssignment.period_number == period_number,
        SubstituteAssignment.substitute_teacher_id == substitute_teacher_id
    )
    existing_sub = db.execute(existing_sub_stmt).scalar_one_or_none()
    if existing_sub:
        raise ValidationException("The selected substitute teacher is already subbing at this period.")

    # Create the assignment
    assignment = SubstituteAssignment(
        date=date,
        period_number=period_number,
        class_id=class_id,
        subject_id=subject_id,
        original_teacher_id=original_teacher_id,
        substitute_teacher_id=substitute_teacher_id,
        status="notified"
    )
    db.add(assignment)
    db.commit()

    # Reload with details for notifications and response
    stmt = select(SubstituteAssignment).options(
        joinedload(SubstituteAssignment.school_class),
        joinedload(SubstituteAssignment.subject),
        joinedload(SubstituteAssignment.original_teacher),
        joinedload(SubstituteAssignment.substitute_teacher)
    ).where(SubstituteAssignment.id == assignment.id)

    assignment_loaded = db.execute(stmt).scalar()
    if not assignment_loaded:
        raise ResourceNotFoundException("SubstituteAssignment", str(assignment.id))

    # Send Notification to the substitute teacher
    subj_name = assignment_loaded.subject.subject_name if assignment_loaded.subject else ""
    message = (
        f"Notice: You have been assigned to cover "
        f"{assignment_loaded.school_class.class_name}{assignment_loaded.school_class.division} "
        f"{subj_name} on {date} during Period {period_number} "
        f"for absent teacher {assignment_loaded.original_teacher.name}."
    )

    send_notification_email(
        db=db,
        user_id=substitute_teacher_id,
        message=message,
        notification_type="substitute_assignment",
        background_tasks=background_tasks
    )

    return assignment_loaded


def assign_substitutes_batch(
    db: Session,
    original_teacher_id: int,
    date: pydate,
    assignments: List[dict],
    background_tasks: Optional[Any] = None
) -> List[SubstituteAssignment]:
    """
    Creates multiple substitute assignments in a single transaction,
    and sends notifications to all substitute teachers.
    """
    # Validate all assignments first
    for idx, assignment_data in enumerate(assignments):
        period_number = assignment_data['period_number']
        substitute_teacher_id = assignment_data['substitute_teacher_id']

        # Check if substitute is already assigned for this period
        existing_sub_stmt = select(SubstituteAssignment).where(
            SubstituteAssignment.date == date,
            SubstituteAssignment.period_number == period_number,
            SubstituteAssignment.substitute_teacher_id == substitute_teacher_id
        )
        existing_sub = db.execute(existing_sub_stmt).scalar_one_or_none()
        if existing_sub:
            raise ValidationException(
                f"Assignment {idx + 1}: Substitute teacher is already subbing at period {period_number}."
            )

        # Check if there's already a substitute assignment for this original teacher/period/date
        existing_orig_stmt = select(SubstituteAssignment).where(
            SubstituteAssignment.date == date,
            SubstituteAssignment.period_number == period_number,
            SubstituteAssignment.original_teacher_id == original_teacher_id
        )
        existing_orig = db.execute(existing_orig_stmt).scalar_one_or_none()
        if existing_orig:
            raise ValidationException(
                f"Assignment {idx + 1}: A substitute is already assigned for this period."
            )

    # Create all assignments
    created_assignments = []
    for assignment_data in assignments:
        assignment = SubstituteAssignment(
            date=date,
            period_number=assignment_data['period_number'],
            class_id=assignment_data['class_id'],
            subject_id=assignment_data['subject_id'],
            original_teacher_id=original_teacher_id,
            substitute_teacher_id=assignment_data['substitute_teacher_id'],
            status="notified"
        )
        db.add(assignment)
        created_assignments.append(assignment)

    db.commit()

    # Reload with details and send notifications
    result = []
    for assignment in created_assignments:
        stmt = select(SubstituteAssignment).options(
            joinedload(SubstituteAssignment.school_class),
            joinedload(SubstituteAssignment.subject),
            joinedload(SubstituteAssignment.original_teacher),
            joinedload(SubstituteAssignment.substitute_teacher)
        ).where(SubstituteAssignment.id == assignment.id)

        assignment_loaded = db.execute(stmt).scalar()
        if not assignment_loaded:
            raise ResourceNotFoundException("SubstituteAssignment", str(assignment.id))

        # Send Notification to the substitute teacher
        subj_name = assignment_loaded.subject.subject_name if assignment_loaded.subject else ""
        message = (
            f"Notice: You have been assigned to cover "
            f"{assignment_loaded.school_class.class_name}{assignment_loaded.school_class.division} "
            f"{subj_name} on {date} during Period {assignment_loaded.period_number} "
            f"for absent teacher {assignment_loaded.original_teacher.name}."
        )

        send_notification_email(
            db=db,
            user_id=assignment_loaded.substitute_teacher_id,
            message=message,
            notification_type="substitute_assignment",
            background_tasks=background_tasks
        )

        result.append(assignment_loaded)

    return result


def get_future_affected_periods(
    db: Session,
    absent_teacher_id: int,
    day_of_week: str
) -> List[AffectedPeriodResponse]:
    """
    Returns timetable slots for the absent teacher on the given day_of_week.
    Excludes slots that already have a substitute assignment pending/accepted.
    """
    day_int = day_to_int(day_of_week)

    stmt = (
        select(TimetableSlot)
        .options(
            joinedload(TimetableSlot.school_class),
            joinedload(TimetableSlot.subject)
        )
        .where(
            TimetableSlot.teacher_id == absent_teacher_id,
            TimetableSlot.day_of_week == day_int
        )
        .order_by(TimetableSlot.period_number)
    )
    slots = db.execute(stmt).scalars().all()

    results = []
    for slot in slots:
        existing = db.execute(
            select(SubstituteAssignment).where(
                SubstituteAssignment.class_id == slot.class_id,
                SubstituteAssignment.period_number == slot.period_number,
                SubstituteAssignment.original_teacher_id == absent_teacher_id,
                SubstituteAssignment.day_of_week == day_int,
                SubstituteAssignment.status.in_(["pending", "notified", "accepted"])
            )
        ).scalar_one_or_none()
        if existing:
            continue

        results.append(
            AffectedPeriodResponse(
                class_id=slot.class_id,
                class_name=slot.school_class.class_name,
                division=slot.school_class.division,
                subject_id=slot.subject_id,
                subject_name=slot.subject.subject_name if slot.subject else None,
                period_number=slot.period_number,
                day_of_week=day_of_week
            )
        )

    return results


def find_available_teachers_for_slot(
    db: Session,
    class_id: int,
    day_of_week: str,
    period_number: int,
    subject_id: int,
    exclude_teacher_id: int
) -> List[AvailableTeacherResponse]:
    """
    Returns available teachers who are not already occupied in the given slot
    (checking both timetable and substitute_assignments).
    Teachers with matching subject expertise are prioritized.
    """
    day_int = day_to_int(day_of_week)

    teachers_stmt = select(Teacher).where(
        Teacher.id != exclude_teacher_id,
        Teacher.status == "ACTIVE"
    )
    teachers_res = db.execute(teachers_stmt)
    candidates = teachers_res.scalars().all()

    available_teachers = []

    for candidate in candidates:
        master_slot_stmt = select(TimetableSlot).where(
            TimetableSlot.teacher_id == candidate.id,
            TimetableSlot.day_of_week == day_int,
            TimetableSlot.period_number == period_number
        )
        master_slot = db.execute(master_slot_stmt).scalar_one_or_none()

        sub_slot_stmt = select(SubstituteAssignment).where(
            SubstituteAssignment.substitute_teacher_id == candidate.id,
            SubstituteAssignment.day_of_week == day_int,
            SubstituteAssignment.period_number == period_number,
            SubstituteAssignment.status.in_(["pending", "notified", "accepted"])
        )
        is_subbing = db.execute(sub_slot_stmt).scalar_one_or_none() is not None

        if master_slot or is_subbing:
            continue

        has_subject_expertise = False
        if subject_id and candidate.subjects_expertise:
            has_subject_expertise = any(s.id == subject_id for s in candidate.subjects_expertise)

        available_teachers.append(
            AvailableTeacherResponse(
                id=candidate.id,
                teacher_id=candidate.teacher_id or str(candidate.id),
                name=candidate.name,
                email=candidate.email,
                max_lectures_per_day=candidate.max_lectures_per_day,
                current_lectures_on_date=0,
                has_subject_expertise=has_subject_expertise
            )
        )

    available_teachers.sort(key=lambda t: (-t.has_subject_expertise, t.current_lectures_on_date))

    return available_teachers


def assign_future_substitutes(
    db: Session,
    original_teacher_id: int,
    assignments: List[FutureSubstituteAssignRequest],
    background_tasks: Optional[Any] = None
) -> List[SubstituteAssignment]:
    """
    Creates substitute assignments for future recurring timetable slots.
    Each assignment object contains: class_id, subject_id, day_of_week,
    period_number, substitute_teacher_id.
    Validates no conflicts exist before creating.
    """
    today = datetime.now().date()
    day_names = [(today + __timedelta(days=i)).strftime("%A") for i in range(7)]

    for idx, assignment_data in enumerate(assignments):
        period_number = assignment_data.period_number
        day_of_week = assignment_data.day_of_week
        day_int = day_to_int(day_of_week)
        substitute_teacher_id = assignment_data.substitute_teacher_id

        if day_of_week not in day_names:
            raise ValidationException(
                f"Assignment {idx + 1}: Invalid day_of_week '{day_of_week}'."
            )

        existing_sub_stmt = select(SubstituteAssignment).where(
            SubstituteAssignment.day_of_week == day_int,
            SubstituteAssignment.period_number == period_number,
            SubstituteAssignment.substitute_teacher_id == substitute_teacher_id,
            SubstituteAssignment.status.in_(["pending", "notified", "accepted"])
        )
        existing_sub = db.execute(existing_sub_stmt).scalar_one_or_none()
        if existing_sub:
            raise ValidationException(
                f"Assignment {idx + 1}: The selected substitute teacher is already assigned for {day_of_week} Period {period_number}."
            )

        existing_orig_stmt = select(SubstituteAssignment).where(
            SubstituteAssignment.day_of_week == day_int,
            SubstituteAssignment.period_number == period_number,
            SubstituteAssignment.original_teacher_id == original_teacher_id,
            SubstituteAssignment.class_id == assignment_data.class_id,
            SubstituteAssignment.status.in_(["pending", "notified", "accepted"])
        )
        existing_orig = db.execute(existing_orig_stmt).scalar_one_or_none()
        if existing_orig:
            raise ValidationException(
                f"Assignment {idx + 1}: A substitute is already assigned for this slot."
            )

    created_assignments = []
    for assignment_data in assignments:
        assignment = SubstituteAssignment(
            date=None,
            day_of_week=day_to_int(assignment_data.day_of_week),
            period_number=assignment_data.period_number,
            class_id=assignment_data.class_id,
            subject_id=assignment_data.subject_id,
            original_teacher_id=original_teacher_id,
            substitute_teacher_id=assignment_data.substitute_teacher_id,
            status="notified"
        )
        db.add(assignment)
        created_assignments.append(assignment)

    db.commit()

    result = []
    for assignment in created_assignments:
        stmt = select(SubstituteAssignment).options(
            joinedload(SubstituteAssignment.school_class),
            joinedload(SubstituteAssignment.subject),
            joinedload(SubstituteAssignment.original_teacher),
            joinedload(SubstituteAssignment.substitute_teacher)
        ).where(SubstituteAssignment.id == assignment.id)

        assignment_loaded = db.execute(stmt).scalar()
        if not assignment_loaded:
            raise ResourceNotFoundException("SubstituteAssignment", str(assignment.id))

        subj_name = assignment_loaded.subject.subject_name if assignment_loaded.subject else ""
        message = (
            f"You have been assigned to substitute for "
            f"{assignment_loaded.original_teacher.name} in "
            f"Class {assignment_loaded.school_class.class_name}"
            f"{assignment_loaded.school_class.division} "
            f"for {subj_name} on {int_to_day(assignment_loaded.day_of_week)} "
            f"Period {assignment_loaded.period_number}."
        )

        send_notification_email(
            db=db,
            user_id=assignment_loaded.substitute_teacher_id,
            message=message,
            notification_type="substitute_assignment",
            background_tasks=background_tasks
        )

        result.append(assignment_loaded)

    return result


def purge_historical_substitute_assignments(db: Session, cutoff_date: pydate) -> int:
    """
    Deletes dated substitute assignments older than the current academic term start
    (data archival to keep the append-only table bounded).

    Recurring (day-of-week) assignments have no date and represent ongoing coverage,
    so they are always kept. Returns the number of rows deleted.
    """
    stmt = delete(SubstituteAssignment).where(
        SubstituteAssignment.date.isnot(None),
        SubstituteAssignment.date < cutoff_date
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount or 0


def __timedelta(days: int):
    from datetime import timedelta
    return timedelta(days=days)
