from typing import List, Dict, Tuple, Optional
from app.services.timetable.models_internal import SolverInput, SolverTeacher, SolverRequirement
from app.services.timetable.constraints import (
    check_teacher_overlap,
    check_teacher_daily_limit,
    check_pt_capacity,
    check_teacher_availability,
    check_no_consecutive_same_subject,
    check_subject_daily_limit
)
from app.core.exceptions import ValidationException

class TimetableSolver:
    def __init__(self, solver_input: SolverInput):
        self.input = solver_input

        # Auto-adjust requirements so they fill all available slots per class
        self.input.weekly_requirements = self.auto_adjust_requirements(
            self.input.weekly_requirements,
            self.input.school_days,
            self.input.periods_per_day,
            self.input.lunch_period
        )

        self.teachers_map = {t.id: t for t in solver_input.teachers}
        
        # Build subject expertise map for faster lookup
        self.teachers_by_subject: Dict[int, List[SolverTeacher]] = {}
        for teacher in solver_input.teachers:
            for sub_id in teacher.subject_expertise:
                if sub_id not in self.teachers_by_subject:
                    self.teachers_by_subject[sub_id] = []
                self.teachers_by_subject[sub_id].append(teacher)

    @staticmethod
    def auto_adjust_requirements(
        requirements: List[SolverRequirement],
        school_days: List[str],
        periods_per_day: int,
        lunch_period: Optional[int]
    ) -> List[SolverRequirement]:
        """
        Auto-distributes weekly requirements so they sum to the total available
        slots per class. Admin-provided periods_per_week values are treated as
        minimums (with a floor of 1). Remaining slots are distributed round-robin.
        """
        total_slots = len(school_days) * (
            periods_per_day - (1 if lunch_period else 0)
        )

        # Group requirements by class
        by_class: Dict[int, List[SolverRequirement]] = {}
        for req in requirements:
            by_class.setdefault(req.class_id, []).append(req)

        adjusted: List[SolverRequirement] = []
        for class_id, reqs in by_class.items():
            n = len(reqs)
            if n == 0:
                continue

            # Step 1: enforce minimum of 1 per subject
            counts = [max(r.periods_per_week, 1) for r in reqs]
            sum_min = sum(counts)

            if sum_min > total_slots:
                # Scale down: subtract from largest first until sum == total_slots
                while sum(counts) > total_slots:
                    max_idx = counts.index(max(counts))
                    if counts[max_idx] <= 1:
                        break  # can't reduce below 1
                    counts[max_idx] -= 1
            elif sum_min < total_slots:
                # Distribute remaining slots round-robin
                remaining = total_slots - sum_min
                i = 0
                while remaining > 0:
                    counts[i % n] += 1
                    remaining -= 1
                    i += 1

            for req, count in zip(reqs, counts):
                adjusted.append(SolverRequirement(
                    class_id=req.class_id,
                    subject_id=req.subject_id,
                    periods_per_week=count,
                    original_periods_per_week=req.periods_per_week
                ))

        return adjusted

    def solve(self) -> List[Dict[str, any]]:
        """
        Solves the timetable using backtracking.
        Returns a list of scheduled slot dicts or raises ValidationException.
        """
        # 1. Build all available slots (excluding lunch breaks)
        unassigned_slots: List[Tuple[int, str, int]] = []
        for school_class in self.input.classes:
            for period in range(1, self.input.periods_per_day + 1):
                if period == self.input.lunch_period:
                    continue
                for day in self.input.school_days:
                    unassigned_slots.append((school_class.id, day, period))

        # Calculate slots per class
        total_slots_per_class = len(self.input.school_days) * (
            self.input.periods_per_day - (1 if self.input.lunch_period else 0)
        )

        def interleave_requirements(requirements: List[int]) -> List[int]:
            """
            Takes [PE, PE, PE, Math, Math, Math, Math, English, English]
            and returns [PE, Math, English, PE, Math, English, PE, Math, Math]
            by round-robin across subject groups.
            """
            from collections import Counter
            counts = Counter(requirements)
            # Sort by count descending so most-frequent subjects are spread first
            subjects_sorted = sorted(counts.keys(), key=lambda s: counts[s], reverse=True)
            
            result = []
            remaining = dict(counts)
            while any(v > 0 for v in remaining.values()):
                for subj in subjects_sorted:
                    if remaining.get(subj, 0) > 0:
                        result.append(subj)
                        remaining[subj] -= 1
            return result

        # 2. Build and pad requirements per class
        class_requirements: Dict[int, List[int]] = {}
        for school_class in self.input.classes:
            class_requirements[school_class.id] = []
            
        for req in self.input.weekly_requirements:
            if req.class_id in class_requirements:
                class_requirements[req.class_id].extend([req.subject_id] * req.periods_per_week)

        # Build self.class_subject_weekly lookup
        self.class_subject_weekly = {}
        for req in self.input.weekly_requirements:
            self.class_subject_weekly[(req.class_id, req.subject_id)] = req.periods_per_week

        # Pad remaining class slots with Free/Study periods (represented as subject_id = 0)
        for class_id, reqs in class_requirements.items():
            if len(reqs) > total_slots_per_class:
                raise ValidationException(
                    f"Class ID {class_id} requires {len(reqs)} periods, "
                    f"but only {total_slots_per_class} slots are available."
                )
            interleaved = interleave_requirements(reqs)
            padding_needed = total_slots_per_class - len(interleaved)
            interleaved.extend([0] * padding_needed)
            class_requirements[class_id] = interleaved

        # Sort slots by: 1. PT subject requirements first, then standard classes to improve MRV heuristic
        # Let's keep it simple: we iterate over class requirements.
        assignments: Dict[Tuple[int, str, int], Tuple[int, int]] = {}
        for slot in self.input.existing_slots:
            assignments[(slot.class_id, slot.day_of_week, slot.period_number)] = (slot.subject_id, slot.teacher_id)
        
        step_count = 0
        max_steps = 100000  # Safety threshold to prevent infinite recursion

        def backtrack(slot_idx: int) -> bool:
            nonlocal step_count
            step_count += 1
            if step_count > max_steps:
                raise ValidationException(
                    "The timetable constraints are too tight or unsolvable. "
                    "Try lowering subject hours, adding more teachers, or adjusting availability."
                )

            if slot_idx == len(unassigned_slots):
                return True

            class_id, day, period = unassigned_slots[slot_idx]
            reqs = class_requirements[class_id]

            if not reqs:
                return backtrack(slot_idx + 1)

            # When building the list of subjects to try for (class_id, day, period):
            remaining_subjects = list(dict.fromkeys(reqs))  # unique, preserving order

            # Sort: PT first, then subjects not yet used today, then used-today, then free
            already_used_today = {
                sid for (cid, d, _), (sid, _) in assignments.items()
                if cid == class_id and d == day and sid != 0
            }

            def subject_priority(s):
                if s == self.input.pt_subject_id:
                    return 0   # PT first
                if s == 0:
                    return 3   # Free period last
                if s in already_used_today:
                    return 2   # Already used today — deprioritize
                return 1       # Not used today — prefer

            subjects_to_try = sorted(remaining_subjects, key=subject_priority)

            for s_id in subjects_to_try:
                # 1. Handle Free Period
                if s_id == 0:
                    reqs.remove(0)
                    assignments[(class_id, day, period)] = (0, 0)
                    if backtrack(slot_idx + 1):
                        return True
                    # Backtrack
                    assignments.pop((class_id, day, period))
                    reqs.append(0)
                    continue

                # 2. Handle standard subjects (require teachers)
                teachers_available = self.teachers_by_subject.get(s_id, [])
                
                # Get allowed teachers for this class-subject from mapping
                allowed_teachers = self.input.class_subject_teachers.get((class_id, s_id), [])
                
                for teacher in teachers_available:
                    # ✅ NEW: Check if teacher is allowed for this class-subject
                    if allowed_teachers and teacher.id not in allowed_teachers:
                        continue  # Skip - teacher not assigned to this class-subject
                    
                    # Validate all constraints
                    if not check_teacher_availability(teacher, day, period):
                        continue
                    if not check_teacher_overlap(teacher.id, day, period, assignments):
                        continue
                    if not check_teacher_daily_limit(teacher.id, day, teacher.max_lectures_per_day, assignments):
                        continue
                    if s_id == self.input.pt_subject_id:
                        if not check_pt_capacity(self.input.pt_subject_id, day, period, assignments):
                            continue

                    if not check_no_consecutive_same_subject(class_id, s_id, day, period, assignments):
                        continue

                    periods_pw = self.class_subject_weekly.get((class_id, s_id), 1)
                    if not check_subject_daily_limit(
                        class_id, s_id, day, periods_pw,
                        len(self.input.school_days), assignments
                    ):
                        continue

                    # Tentative assignment
                    reqs.remove(s_id)
                    assignments[(class_id, day, period)] = (s_id, teacher.id)

                    if backtrack(slot_idx + 1):
                        return True

                    # Undo assignment (Backtrack)
                    assignments.pop((class_id, day, period))
                    reqs.append(s_id)

            return False

        if not backtrack(0):
            raise ValidationException(
                "Could not generate a valid timetable satisfying all constraints. "
                "Please review teacher availability and weekly requirements."
            )

        # Convert assignments map to output JSON structure
        result_schedule = []
        for (class_id, day, period), (sub_id, teach_id) in assignments.items():
            result_schedule.append({
                "class_id": class_id,
                "day_of_week": day,
                "period_number": period,
                "subject_id": sub_id,
                "teacher_id": teach_id
            })

        return result_schedule