from typing import List, Dict, Tuple, Optional
from app.services.timetable.models_internal import SolverInput, SolverTeacher, SolverRequirement
from app.services.timetable.constraints import (
    check_teacher_overlap,
    check_teacher_daily_limit,
    check_pt_capacity,
    check_teacher_availability
)
from app.core.exceptions import ValidationException

class TimetableSolver:
    def __init__(self, solver_input: SolverInput):
        self.input = solver_input
        self.teachers_map = {t.id: t for t in solver_input.teachers}
        
        # Build subject expertise map for faster lookup
        self.teachers_by_subject: Dict[int, List[SolverTeacher]] = {}
        for teacher in solver_input.teachers:
            for sub_id in teacher.subject_expertise:
                if sub_id not in self.teachers_by_subject:
                    self.teachers_by_subject[sub_id] = []
                self.teachers_by_subject[sub_id].append(teacher)

    def solve(self) -> List[Dict[str, any]]:
        """
        Solves the timetable using backtracking.
        Returns a list of scheduled slot dicts or raises ValidationException.
        """
        # 1. Build all available slots (excluding lunch breaks)
        unassigned_slots: List[Tuple[int, str, int]] = []
        for school_class in self.input.classes:
            for day in self.input.school_days:
                for period in range(1, self.input.periods_per_day + 1):
                    if period == self.input.lunch_period:
                        continue
                    unassigned_slots.append((school_class.id, day, period))

        # Calculate slots per class
        total_slots_per_class = len(self.input.school_days) * (
            self.input.periods_per_day - (1 if self.input.lunch_period else 0)
        )

        # 2. Build and pad requirements per class
        class_requirements: Dict[int, List[int]] = {}
        for school_class in self.input.classes:
            class_requirements[school_class.id] = []
            
        for req in self.input.weekly_requirements:
            if req.class_id in class_requirements:
                class_requirements[req.class_id].extend([req.subject_id] * req.periods_per_week)

        # Pad remaining class slots with Free/Study periods (represented as subject_id = 0)
        for class_id, reqs in class_requirements.items():
            if len(reqs) > total_slots_per_class:
                raise ValidationException(
                    f"Class ID {class_id} requires {len(reqs)} periods, "
                    f"but only {total_slots_per_class} slots are available."
                )
            padding_needed = total_slots_per_class - len(reqs)
            reqs.extend([0] * padding_needed)

        # Sort slots by: 1. PT subject requirements first, then standard classes to improve MRV heuristic
        # Let's keep it simple: we iterate over class requirements.
        assignments: Dict[Tuple[int, str, int], Tuple[int, int]] = {}
        
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

            # Heuristic: Try to schedule PT first, then other actual subjects, and leave Free periods (0) for last.
            unique_subjects = list(set(reqs))
            # Sort order: PT subject first, then other non-zero subjects, then Free period (0)
            unique_subjects.sort(key=lambda s: (-1 if s == self.input.pt_subject_id else (0 if s > 0 else 1)))

            for s_id in unique_subjects:
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
                for teacher in teachers_available:
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
