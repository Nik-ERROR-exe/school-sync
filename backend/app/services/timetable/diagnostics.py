from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from app.services.timetable.models_internal import SolverInput, SolverTeacher, SolverRequirement
from app.services.timetable.constraints import check_teacher_availability
import math


@dataclass
class DiagnosticIssue:
    step: int
    field: str
    message: str
    severity: str  # "error" | "warning"
    suggestion: str = ""
    redirect_step: int = 0
    highlight_field: str = ""
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None


class TimetableDiagnostics:
    """
    Analyzes a SolverInput and returns a list of issues that would prevent
    the solver from finding a valid timetable, with hints on which wizard
    step to visit and what field to change.
    """

    def __init__(self, solver_input: SolverInput):
        self.input = solver_input
        self.issues: List[DiagnosticIssue] = []
        # Build name lookup maps for human-readable messages
        self._class_names: Dict[int, str] = {}
        for c in solver_input.classes:
            self._class_names[c.id] = f"{c.class_name}-{c.division}"
        # Subject names come from the caller via SolverInput.subject_names
        self._subject_names: Dict[int, str] = solver_input.subject_names

    def _class_name(self, class_id: int) -> str:
        return self._class_names.get(class_id, f"Class #{class_id}")

    def _subject_label(self, subject_id: int) -> str:
        return self._subject_names.get(subject_id, f"Subject #{subject_id}")

    def run(self) -> List[DiagnosticIssue]:
        self.issues = []
        self._check_total_slots()
        self._check_teacher_coverage()
        self._check_teacher_capacity()
        self._check_existing_slot_load()
        self._check_pt_capacity()
        self._check_teacher_availability()
        self._check_teacher_back_to_back_feasibility()
        self._check_subject_weekly_limits()
        return self.issues

    def _check_total_slots(self):
        total_slots = len(self.input.school_days) * (
            self.input.periods_per_day - (1 if self.input.lunch_period else 0)
        )
        by_class: Dict[int, int] = {}
        for req in self.input.weekly_requirements:
            by_class[req.class_id] = by_class.get(req.class_id, 0) + req.periods_per_week

        for class_id, total in by_class.items():
            if total > total_slots:
                cn = self._class_name(class_id)
                shortfall = total - total_slots
                self.issues.append(DiagnosticIssue(
                    step=1,
                    field="periods_per_day",
                    message=(
                        f"Class {cn} requires {total} periods/week but only {total_slots} "
                        f"teachable slots exist ({self.input.periods_per_day} periods/day × "
                        f"{len(self.input.school_days)} days minus lunch breaks). "
                        f"You need {shortfall} more slots."
                    ),
                    suggestion=(
                        f"The school schedule is fixed at {self.input.periods_per_day} periods/day "
                        f"with lunch in period {self.input.lunch_period}. Go to Step 3 and reduce "
                        f"weekly subject hours for class {cn}."
                    ),
                    redirect_step=3,
                    highlight_field="periods_per_week",
                    severity="error",
                    class_id=class_id,
                ))

    def _check_teacher_coverage(self):
        by_class: Dict[int, set] = {}
        for req in self.input.weekly_requirements:
            by_class.setdefault(req.class_id, set()).add(req.subject_id)

        for class_id, subjects in by_class.items():
            for subject_id in subjects:
                all_qualified = [t for t in self.input.teachers if subject_id in t.subject_expertise]
                if not all_qualified:
                    cn = self._class_name(class_id)
                    sl = self._subject_label(subject_id)
                    self.issues.append(DiagnosticIssue(
                        step=2,
                        field="teachers",
                        message=(
                            f"No teacher is qualified to teach {sl} for class {cn}. "
                            f"The solver cannot assign this subject without a teacher."
                        ),
                        suggestion=(
                            f"Go to Admin → Teachers and assign {sl} to at least one active teacher, "
                            f"or remove {sl} from class {cn}'s requirements in Step 3."
                        ),
                        redirect_step=2,
                        highlight_field="teachers",
                        severity="error",
                        class_id=class_id,
                        subject_id=subject_id,
                    ))

    def _check_teacher_capacity(self):
        days = len(self.input.school_days)
        by_class: Dict[int, Dict[int, int]] = {}
        for req in self.input.weekly_requirements:
            by_class.setdefault(req.class_id, {})[req.subject_id] = req.periods_per_week

        for class_id, subjects in by_class.items():
            for subject_id, needed in subjects.items():
                all_qualified = [t for t in self.input.teachers if subject_id in t.subject_expertise]
                allowed_ids = self.input.class_subject_teachers.get((class_id, subject_id))
                if allowed_ids is not None and len(allowed_ids) > 0:
                    qualified_allowed = [t for t in all_qualified if t.id in allowed_ids]
                    teachers_to_check = qualified_allowed if qualified_allowed else all_qualified
                else:
                    teachers_to_check = all_qualified

                total_cap = sum(t.max_lectures_per_day for t in teachers_to_check) * days
                if total_cap < needed:
                    cn = self._class_name(class_id)
                    sl = self._subject_label(subject_id)
                    teacher_names = ", ".join(t.name for t in teachers_to_check[:3])
                    if len(teachers_to_check) > 3:
                        teacher_names += f" (+{len(teachers_to_check) - 3} more)"
                    self.issues.append(DiagnosticIssue(
                        step=2,
                        field="teachers",
                        message=(
                            f"{sl} in class {cn} needs {needed} periods/week but "
                            f"available teachers ({teacher_names or 'none'}) can only cover {total_cap} periods "
                            f"({len(teachers_to_check)} teacher(s) × {days} days × max "
                            f"{teachers_to_check[0].max_lectures_per_day if teachers_to_check else 0}/day)."
                        ),
                        suggestion=(
                            f"Add another teacher who can teach {sl}, "
                            f"increase existing teachers' max lectures/day, "
                            f"or reduce {sl} periods to {total_cap} or fewer in Step 3."
                        ),
                        redirect_step=2,
                        highlight_field="teachers",
                        severity="error",
                        class_id=class_id,
                        subject_id=subject_id,
                    ))

    def _check_existing_slot_load(self):
        """
        Teachers may already be occupied by saved timetable slots for OTHER classes.
        If a subject's teachers have little remaining capacity after those saved slots,
        the generating class cannot be scheduled — surface it as an actionable issue.
        """
        if not self.input.existing_slots:
            return

        # teacher_id -> day -> count of existing lectures (saved slots for other classes)
        teacher_day_count: Dict[int, Dict[str, int]] = {}
        for slot in self.input.existing_slots:
            if not slot.teacher_id or slot.subject_id == 0:
                continue
            teacher_day_count.setdefault(slot.teacher_id, {})
            teacher_day_count[slot.teacher_id][slot.day_of_week] = (
                teacher_day_count[slot.teacher_id].get(slot.day_of_week, 0) + 1
            )

        days = len(self.input.school_days)
        by_class: Dict[int, Dict[int, int]] = {}
        for req in self.input.weekly_requirements:
            by_class.setdefault(req.class_id, {})[req.subject_id] = req.periods_per_week

        for class_id, subjects in by_class.items():
            for subject_id, needed in subjects.items():
                all_qualified = [t for t in self.input.teachers if subject_id in t.subject_expertise]
                allowed_ids = self.input.class_subject_teachers.get((class_id, subject_id))
                if allowed_ids is not None and len(allowed_ids) > 0:
                    qualified_allowed = [t for t in all_qualified if t.id in allowed_ids]
                    teachers_to_check = qualified_allowed if qualified_allowed else all_qualified
                else:
                    teachers_to_check = all_qualified

                remaining_total = 0
                busy_notes = []
                for t in teachers_to_check:
                    day_counts = teacher_day_count.get(t.id, {})
                    remaining = sum(
                        max(0, t.max_lectures_per_day - day_counts.get(day, 0))
                        for day in self.input.school_days
                    )
                    if remaining < t.max_lectures_per_day * days:
                        busy_notes.append(f"{t.name} ({remaining} free)")
                    remaining_total += remaining

                if remaining_total < needed:
                    cn = self._class_name(class_id)
                    sl = self._subject_label(subject_id)
                    self.issues.append(DiagnosticIssue(
                        step=2,
                        field="teachers",
                        message=(
                            f"{sl} in class {cn} needs {needed} periods/week, but its teachers "
                            f"({', '.join(busy_notes) or 'none'}) only have {remaining_total} free periods "
                            f"after their saved slots in other classes."
                        ),
                        suggestion=(
                            f"Regenerate or clear other classes' saved timetables first, "
                            f"add another teacher for {sl}, or reduce {sl} periods in Step 3."
                        ),
                        redirect_step=2,
                        highlight_field="teachers",
                        severity="error",
                        class_id=class_id,
                        subject_id=subject_id,
                    ))

    def _check_pt_capacity(self):
        pt_id = self.input.pt_subject_id
        pt_teachers = [t for t in self.input.teachers if pt_id in t.subject_expertise]
        days = len(self.input.school_days)
        teachable = self.input.periods_per_day - (1 if self.input.lunch_period else 0)

        total_pt_needed = sum(
            req.periods_per_week for req in self.input.weekly_requirements if req.subject_id == pt_id
        )
        # PT ground allows at most 2 classes simultaneously, and each class needs its own teacher.
        total_pt_capacity = min(len(pt_teachers), 2) * teachable * days
        if total_pt_needed > total_pt_capacity:
            pt_teacher_names = ", ".join(t.name for t in pt_teachers[:3])
            self.issues.append(DiagnosticIssue(
                step=2,
                field="teachers",
                message=(
                    f"PT (Physical Training) needs {total_pt_needed} periods/week across all classes, "
                    f"but ground capacity is only {total_pt_capacity} "
                    f"({len(pt_teachers)} PT teacher(s): {pt_teacher_names or 'none'} × {days} days × 2 slots/day)."
                ),
                suggestion=(
                    f"Add more teachers with PT expertise, or reduce PT periods per class in Step 3."
                ),
                redirect_step=2,
                highlight_field="teachers",
                severity="error",
                subject_id=pt_id,
            ))

    def _check_teacher_availability(self):
        days = len(self.input.school_days)
        by_class: Dict[int, Dict[int, int]] = {}
        for req in self.input.weekly_requirements:
            by_class.setdefault(req.class_id, {})[req.subject_id] = req.periods_per_week

        for class_id, subjects in by_class.items():
            for subject_id, needed in subjects.items():
                all_qualified = [t for t in self.input.teachers if subject_id in t.subject_expertise]
                for teacher in all_qualified:
                    if not teacher.availability:
                        continue
                    available_days = 0
                    for day in self.input.school_days:
                        available_periods = teacher.availability.get(day, [])
                        available_periods = [p for p in available_periods if p != self.input.lunch_period]
                        if len(available_periods) > 0:
                            available_days += 1
                    max_possible = available_days * teacher.max_lectures_per_day
                    if max_possible < needed:
                        cn = self._class_name(class_id)
                        sl = self._subject_label(subject_id)
                        self.issues.append(DiagnosticIssue(
                            step=2,
                            field="teachers",
                            message=(
                                f"Teacher {teacher.name} is only available on "
                                f"{available_days}/{days} school days, allowing at most {max_possible} "
                                f"lectures/week for {sl}, but class {cn} needs {needed}."
                            ),
                            suggestion=(
                                f"Expand {teacher.name}'s availability to more days in their profile, "
                                f"add another teacher for {sl}, or reduce {sl} periods in Step 3."
                            ),
                            redirect_step=2,
                            highlight_field="teachers",
                            severity="warning",
                            class_id=class_id,
                            subject_id=subject_id,
                            teacher_id=teacher.id,
                        ))

    @staticmethod
    def _max_lectures_without_back_to_back(periods_per_day: int, lunch_period: Optional[int]) -> int:
        """
        Largest number of lectures a teacher can fit in one day without any two
        being consecutive. The lunch period breaks adjacency, so compute the max
        independent set across each consecutive run: sum(ceil(run_length / 2)).
        """
        periods = [p for p in range(1, periods_per_day + 1) if p != lunch_period]
        if not periods:
            return 0
        total = 0
        run = 1
        for a, b in zip(periods, periods[1:]):
            if b == a + 1:
                run += 1
            else:
                total += math.ceil(run / 2)
                run = 1
        total += math.ceil(run / 2)
        return total

    def _check_teacher_back_to_back_feasibility(self):
        """
        With the no-back-to-back rule, a teacher can teach at most
        `_max_lectures_without_back_to_back` lectures on a day without any two being
        consecutive. Warn if their configured daily limit exceeds that — the solver
        will be unable to fill the day.
        """
        max_non_consecutive = self._max_lectures_without_back_to_back(
            self.input.periods_per_day, self.input.lunch_period
        )
        if max_non_consecutive <= 0:
            return

        for teacher in self.input.teachers:
            if teacher.max_lectures_per_day <= max_non_consecutive:
                continue
            self.issues.append(DiagnosticIssue(
                step=2,
                field="teachers",
                message=(
                    f"Teacher {teacher.name} has a daily limit of {teacher.max_lectures_per_day} "
                    f"lectures, but with no back-to-back lectures allowed the most that can be "
                    f"scheduled in one day is {max_non_consecutive}."
                ),
                suggestion=(
                    f"Reduce {teacher.name}'s max lectures/day to {max_non_consecutive} or fewer "
                    f"in their teacher profile."
                ),
                redirect_step=2,
                highlight_field="teachers",
                severity="warning",
                teacher_id=teacher.id,
            ))

    def _check_subject_weekly_limits(self):
        days = len(self.input.school_days)
        by_class: Dict[int, Dict[int, int]] = {}
        for req in self.input.weekly_requirements:
            by_class.setdefault(req.class_id, {})[req.subject_id] = req.periods_per_week

        for class_id, subjects in by_class.items():
            for subject_id, periods_pw in subjects.items():
                teachable = self.input.periods_per_day - (1 if self.input.lunch_period else 0)
                max_per_day = math.ceil(periods_pw / days)
                if max_per_day > teachable:
                    cn = self._class_name(class_id)
                    sl = self._subject_label(subject_id)
                    max_safe = teachable * days
                    self.issues.append(DiagnosticIssue(
                        step=3,
                        field="periods_per_week",
                        message=(
                            f"{sl} in class {cn} has {periods_pw} periods/week. "
                            f"That would require up to {max_per_day} periods of the same subject per day, "
                            f"but only {teachable} teachable periods exist per day."
                        ),
                        suggestion=(
                            f"Reduce {sl} periods to {max_safe} or fewer in Step 3, "
                            f"or add more school days in Step 1."
                        ),
                        redirect_step=3,
                        highlight_field="periods_per_week",
                        severity="error",
                        class_id=class_id,
                        subject_id=subject_id,
                    ))
