from typing import List, Dict, Tuple, Optional
import random
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
        self.input.weekly_requirements = self.auto_adjust_requirements(
            self.input.weekly_requirements,
            self.input.school_days,
            self.input.periods_per_day,
            self.input.lunch_period
        )
        self.teachers_map = {t.id: t for t in solver_input.teachers}
        self.teachers_by_subject: Dict[int, List[SolverTeacher]] = {}
        for teacher in solver_input.teachers:
            for sub_id in teacher.subject_expertise:
                self.teachers_by_subject.setdefault(sub_id, []).append(teacher)

    @staticmethod
    def auto_adjust_requirements(
        requirements: List[SolverRequirement],
        school_days: List[str],
        periods_per_day: int,
        lunch_period: Optional[int]
    ) -> List[SolverRequirement]:
        total_slots = len(school_days) * (
            periods_per_day - (1 if lunch_period else 0)
        )
        by_class: Dict[int, List[SolverRequirement]] = {}
        for req in requirements:
            by_class.setdefault(req.class_id, []).append(req)

        adjusted: List[SolverRequirement] = []
        for class_id, reqs in by_class.items():
            n = len(reqs)
            if n == 0:
                continue
            counts = [max(r.periods_per_week, 1) for r in reqs]
            sum_min = sum(counts)
            if sum_min > total_slots:
                while sum(counts) > total_slots:
                    max_idx = counts.index(max(counts))
                    if counts[max_idx] <= 1:
                        break
                    counts[max_idx] -= 1
            elif sum_min < total_slots:
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
        # Quick capacity check
        self._check_teacher_capacity()

        max_attempts = 1000
        for attempt in range(max_attempts):
            try:
                return self._try_solve(attempt)
            except ValidationException:
                continue
        raise ValidationException(
            "Could not generate a valid timetable after 1000 attempts. "
            "Please check teacher assignments and weekly requirements."
        )

    def _check_teacher_capacity(self):
        """Fail early only if no teacher globally can teach a required subject."""
        days = len(self.input.school_days)
        for req in self.input.weekly_requirements:
            class_id, sub_id, needed = req.class_id, req.subject_id, req.periods_per_week
            all_qualified = self.teachers_by_subject.get(sub_id, [])
            if not all_qualified:
                raise ValidationException(
                    f"No teacher has subject {sub_id} in their expertise. "
                    "Assign the subject to at least one teacher first."
                )

            allowed_ids = self.input.class_subject_teachers.get((class_id, sub_id))
            if allowed_ids is not None and len(allowed_ids) > 0:
                # Filter to allowed teachers who are actually qualified
                qualified_allowed = [t for t in all_qualified if t.id in allowed_ids]
                if qualified_allowed:
                    # Use the restricted set
                    teachers_to_check = qualified_allowed
                else:
                    # None of the allowed teachers are qualified → fallback to all experts
                    teachers_to_check = all_qualified
            else:
                teachers_to_check = all_qualified

            total_cap = sum(t.max_lectures_per_day for t in teachers_to_check) * days
            if total_cap < needed:
                raise ValidationException(
                    f"Subject {sub_id} in class {class_id} needs {needed} periods/week "
                    f"but total teacher capacity is only {total_cap}."
                )

    def _try_solve(self, seed: int) -> List[Dict[str, any]]:
        random.seed(seed)
        # Build slots (no lunch)
        all_slots: List[Tuple[int, str, int]] = []
        for school_class in self.input.classes:
            for period in range(1, self.input.periods_per_day + 1):
                if period == self.input.lunch_period:
                    continue
                for day in self.input.school_days:
                    all_slots.append((school_class.id, day, period))
        random.shuffle(all_slots)

        class_subject_pool: Dict[int, List[int]] = {c.id: [] for c in self.input.classes}
        for req in self.input.weekly_requirements:
            if req.class_id in class_subject_pool:
                class_subject_pool[req.class_id].extend([req.subject_id] * req.periods_per_week)

        total_slots_per_class = len(self.input.school_days) * (
            self.input.periods_per_day - (1 if self.input.lunch_period else 0)
        )
        for c in self.input.classes:
            if len(class_subject_pool[c.id]) != total_slots_per_class:
                raise ValidationException(f"Class {c.class_name}-{c.division} period count mismatch.")

        self.class_subject_weekly = {}
        for req in self.input.weekly_requirements:
            self.class_subject_weekly[(req.class_id, req.subject_id)] = req.periods_per_week

        assignments: Dict[Tuple[int, str, int], Tuple[int, int]] = {}
        for slot in self.input.existing_slots:
            assignments[(slot.class_id, slot.day_of_week, slot.period_number)] = (slot.subject_id, slot.teacher_id)
            if slot.subject_id != 0:
                pool = class_subject_pool.get(slot.class_id, [])
                if slot.subject_id in pool:
                    pool.remove(slot.subject_id)

        def get_possible_teachers(class_id, sub_id, day, period):
            teachers = self.teachers_by_subject.get(sub_id, [])
            allowed = self.input.class_subject_teachers.get((class_id, sub_id), None)
            if allowed:
                teachers = [t for t in teachers if t.id in allowed]
            # else no mapping or empty mapping → use all teachers with expertise
            valid = []
            for t in teachers:
                if not check_teacher_availability(t, day, period):
                    continue
                if not check_teacher_overlap(t.id, day, period, assignments):
                    continue
                if not check_teacher_daily_limit(t.id, day, t.max_lectures_per_day, assignments):
                    continue
                if sub_id == self.input.pt_subject_id:
                    if not check_pt_capacity(self.input.pt_subject_id, day, period, assignments):
                        continue
                if not check_no_consecutive_same_subject(class_id, sub_id, day, period, assignments):
                    continue
                pw = self.class_subject_weekly.get((class_id, sub_id), 1)
                if not check_subject_daily_limit(class_id, sub_id, day, pw,
                                                len(self.input.school_days), assignments):
                    continue
                valid.append(t.id)
            random.shuffle(valid)
            return valid

        def backtrack(slot_idx: int) -> bool:
            if slot_idx == len(all_slots):
                return True
            class_id, day, period = all_slots[slot_idx]
            pool = class_subject_pool[class_id]
            if not pool:
                return False
            remaining_subjects = list(set(pool))
            random.shuffle(remaining_subjects)
            for sub_id in remaining_subjects:
                possible_teachers = get_possible_teachers(class_id, sub_id, day, period)
                for teach_id in possible_teachers:
                    pool.remove(sub_id)
                    assignments[(class_id, day, period)] = (sub_id, teach_id)
                    if backtrack(slot_idx + 1):
                        return True
                    assignments.pop((class_id, day, period))
                    pool.append(sub_id)
            return False

        if not backtrack(0):
            raise ValidationException("No solution for this attempt.")

        result = []
        for (class_id, day, period), (sub_id, teach_id) in assignments.items():
            result.append({
                "class_id": class_id,
                "day_of_week": day,
                "period_number": period,
                "subject_id": sub_id,
                "teacher_id": teach_id
            })
        return result