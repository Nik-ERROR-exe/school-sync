import os
from typing import List, Dict, Any, Tuple

from ortools.sat.python import cp_model

from app.services.timetable.models_internal import SolverInput
from app.services.timetable.diagnostics import TimetableDiagnostics
from app.core.exceptions import ValidationException


class TimetableSolver:
    """CP-SAT based timetable solver.

    Replaces the previous hand-written backtracking solver. Public interface
    is unchanged: solve() returns List[Dict[str, Any]] with keys class_id,
    day_of_week, period_number, subject_id, teacher_id; on infeasibility it
    raises ValidationException.
    """

    def __init__(self, solver_input: SolverInput, time_limit: float = 180.0):
        self.input = solver_input
        self.time_limit = time_limit

    def solve(self) -> List[Dict[str, Any]]:
        # Pre-flight diagnostics — same contract as the previous solver.
        issues = TimetableDiagnostics(self.input).run()
        hard = [i for i in issues if getattr(i, "severity", None) == "error"]
        if hard:
            raise ValidationException(
                "Cannot generate timetable: " + " ".join(i.message for i in hard)
            )

        days = list(self.input.school_days)
        classes = list(self.input.classes)

        sat_periods = self.input.saturday_periods
        if sat_periods is None:
            sat_periods = self.input.periods_per_day

        def teachable_periods(day):
            cap = min(sat_periods, self.input.periods_per_day) if day == "Saturday" \
                  else self.input.periods_per_day
            ps = [p for p in range(1, cap + 1) if p != self.input.lunch_period]
            return ps

        per_day_periods: Dict[str, List[int]] = {d: teachable_periods(d) for d in days}

        req_by_class: Dict[int, List[Tuple[int, int]]] = {}
        for r in self.input.weekly_requirements:
            req_by_class.setdefault(r.class_id, []).append(
                (r.subject_id, r.periods_per_week)
            )

        model = cp_model.CpModel()

        # --- Decision variables: x[(class_id, day, period, subject_id, teacher_id)] ---
        x: Dict[Tuple[int, str, int, int, int], cp_model.IntVar] = {}
        for c in classes:
            for (s_id, _w) in req_by_class.get(c.id, []):
                eligible = self.input.class_subject_teachers.get((c.id, s_id), [])
                for t_id in eligible:
                    for d in days:
                        for p in per_day_periods[d]:
                            x[(c.id, d, p, s_id, t_id)] = model.NewBoolVar(
                                f"x_{c.id}_{d}_{p}_{s_id}_{t_id}"
                            )

        # --- Index by (class, day, period) for the slot-exactly-one constraint ---
        slot_vars: Dict[Tuple[int, str, int], List[cp_model.IntVar]] = {}
        for (c_id, d, p, _s, _t), v in x.items():
            slot_vars.setdefault((c_id, d, p), []).append(v)

        for c in classes:
            for d in days:
                for p in per_day_periods[d]:
                    vs = slot_vars.get((c.id, d, p), [])
                    if not vs:
                        raise ValidationException(
                            f"No eligible teacher for class {c.class_name}-{c.division} "
                            f"on {d} period {p}. Check teacher-class-subject assignments."
                        )
                    if self.input.allow_gaps:
                        model.Add(sum(vs) <= 1)
                    else:
                        model.Add(sum(vs) == 1)

        # --- Weekly requirement per (class, subject) ---
        for c in classes:
            for (s_id, w) in req_by_class.get(c.id, []):
                vs = [v for (cid, _d, _p, sid, _t), v in x.items()
                      if cid == c.id and sid == s_id]
                if self.input.allow_gaps:
                    model.Add(sum(vs) <= w)
                else:
                    model.Add(sum(vs) == w)

        # --- Block teachers who are already booked in other classes ---
        blocked: Dict[Tuple[int, str, int], int] = {}
        for slot in self.input.existing_slots:
            key = (slot.teacher_id, slot.day_of_week, slot.period_number)
            blocked[key] = blocked.get(key, 0) + 1

        for (c_id, d, p, _s, t_id), v in x.items():
            if blocked.get((t_id, d, p), 0) > 0:
                model.Add(v == 0)

        # --- Teacher overlap across generating classes ---
        teacher_ids = {key[4] for key in x.keys()}
        for t_id in teacher_ids:
            for d in days:
                for p in per_day_periods[d]:
                    vs = [v for (cid, dd, pp, _s, tid), v in x.items()
                          if tid == t_id and dd == d and pp == p]
                    if vs:
                        model.Add(sum(vs) <= 1)

        # --- Subject daily cap and no-consecutive-same-subject ---
        num_days = len(days)

        # Adjacent teachable-period pairs; do not pair across lunch.
        adjacent_pairs_by_day: Dict[str, List[Tuple[int, int]]] = {
            d: [(per_day_periods[d][i], per_day_periods[d][i+1])
                for i in range(len(per_day_periods[d]) - 1)
                if per_day_periods[d][i+1] == per_day_periods[d][i] + 1]
            for d in days
        }

        used: Dict[Tuple[int, str, int, int], cp_model.IntVar] = {}
        for c in classes:
            for (s_id, w) in req_by_class.get(c.id, []):
                cap = (w + num_days - 1) // num_days
                eligible = self.input.class_subject_teachers.get((c.id, s_id), [])
                for d in days:
                    day_vars: List[cp_model.IntVar] = []
                    for p in per_day_periods[d]:
                        pv = [
                            x[(c.id, d, p, s_id, t_id)]
                            for t_id in eligible
                            if (c.id, d, p, s_id, t_id) in x
                        ]
                        if pv:
                            key = (c.id, d, p, s_id)
                            used[key] = model.NewBoolVar(f"used_{c.id}_{d}_{p}_{s_id}")
                            model.Add(sum(pv) == used[key])
                            day_vars.append(used[key])
                    if day_vars:
                        model.Add(sum(day_vars) <= cap)

        for d in days:
            for (p_a, p_b) in adjacent_pairs_by_day[d]:
                for c in classes:
                    for (s_id, _w) in req_by_class.get(c.id, []):
                        a = used.get((c.id, d, p_a, s_id))
                        b = used.get((c.id, d, p_b, s_id))
                        if a is not None and b is not None:
                            model.Add(a + b <= 1)

        # --- Teacher daily cap and 4-consecutive-then-rest ---
        teacher_lookup = {t.id: t for t in self.input.teachers}
        existing_teacher_daily: Dict[Tuple[int, str], int] = {}
        for s in self.input.existing_slots:
            k = (s.teacher_id, s.day_of_week)
            existing_teacher_daily[k] = existing_teacher_daily.get(k, 0) + 1

        # Split each day's teachable periods into contiguous runs (breaks at lunch).
        for t_id in teacher_ids:
            t = teacher_lookup.get(t_id)
            if t is None:
                continue
            if t_id in self.input.soft_violation_teachers:
                continue
            max_per_day = t.max_lectures_per_day

            for d in days:
                runs: List[List[int]] = []
                _cur: List[int] = []
                for _p in per_day_periods[d]:
                    if _p == self.input.lunch_period:
                        if _cur:
                            runs.append(_cur)
                            _cur = []
                        continue
                    _cur.append(_p)
                if _cur:
                    runs.append(_cur)

                by_period: Dict[int, List[cp_model.IntVar]] = {}
                for (cid, dd, pp, _s, tid), v in x.items():
                    if tid == t_id and dd == d:
                        by_period.setdefault(pp, []).append(v)

                all_day = [v for vs in by_period.values() for v in vs]
                if all_day:
                    base = existing_teacher_daily.get((t_id, d), 0)
                    model.Add(sum(all_day) + base <= max_per_day)

                for run in runs:
                    for i in range(max(0, len(run) - 4)):
                        wv: List[cp_model.IntVar] = []
                        for p in run[i:i + 5]:
                            wv.extend(by_period.get(p, []))
                        if wv:
                            model.Add(sum(wv) <= 4)

        # --- PT capacity: at most 2 classes on PT ground at the same time ---
        for d in days:
            for p in per_day_periods[d]:
                pt_vars = [
                    v for (cid, dd, pp, s_id, _t), v in x.items()
                    if dd == d and pp == p and s_id == self.input.pt_subject_id
                ]
                if pt_vars:
                    existing_pt = sum(
                        1 for s in self.input.existing_slots
                        if s.day_of_week == d
                        and s.period_number == p
                        and s.subject_id == self.input.pt_subject_id
                    )
                    model.Add(sum(pt_vars) + existing_pt <= 2)

        # --- Period 1 pre-fill: class teacher of every generating class ---
        PERIOD_1 = 1
        for c in classes:
            ct = c.class_teacher_id
            if ct is None:
                raise ValidationException(
                    f"Class {c.class_name}-{c.division} has no class teacher assigned."
                )
            remaining: Dict[int, int] = {}
            for (s_id, w) in req_by_class.get(c.id, []):
                if ct in self.input.class_subject_teachers.get((c.id, s_id), []):
                    remaining[s_id] = w
            if not remaining:
                raise ValidationException(
                    f"Class teacher of {c.class_name}-{c.division} does not teach "
                    f"any subject of that class."
                )
            for d in days:
                if PERIOD_1 not in per_day_periods[d]:
                    continue
                if not remaining:
                    raise ValidationException(
                        f"Class teacher of {c.class_name}-{c.division} has no "
                        f"remaining weekly periods to cover period 1 on every school day."
                    )
                s_id = min(remaining, key=lambda s: (-remaining[s], s))
                key = (c.id, d, PERIOD_1, s_id, ct)
                if key not in x:
                    raise ValidationException(
                        f"Cannot place class teacher of {c.class_name}-{c.division} at "
                        f"period 1 on {d}: teacher {ct} is not in the eligibility map "
                        f"for subject {s_id}. Verify teacher-class-subject assignments."
                    )
                model.Add(x[key] == 1)
                remaining[s_id] -= 1
                if remaining[s_id] == 0:
                    del remaining[s_id]

        if self.input.allow_gaps or self.input.relax_teacher_caps:
            filled_terms = list(x.values())
            # Prefer filled slots, then unrelaxed teachers, then fewer slack
            # teachers. Weights chosen so 1 filled slot > 100 relaxed teachers.
            model.Maximize(sum(filled_terms))

        # --- Solve ---
        cp_solver = cp_model.CpSolver()
        cp_solver.parameters.max_time_in_seconds = self.time_limit
        cp_solver.parameters.num_search_workers = 8
        status = cp_solver.Solve(model)

        if os.environ.get("CP_SAT_DEBUG") == "1":
            self._dump_debug(model, cp_solver, status, x, req_by_class,
                             per_day_periods, classes, teacher_ids, days)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            if status == cp_model.INFEASIBLE:
                raise ValidationException(
                    "Timetable is infeasible with the current constraints. "
                    "Review teacher availability, weekly requirements, and class teacher assignments."
                )
            if status == cp_model.MODEL_INVALID:
                raise ValidationException(
                    "Timetable model is invalid — please report this to the developer."
                )
            raise ValidationException(
                f"Timetable generation timed out after {self.time_limit}s. "
                "Try generating fewer classes at once or relaxing constraints."
            )

        # --- Extract solution ---
        result: List[Dict[str, Any]] = []
        for (c_id, d, p, s_id, t_id), v in x.items():
            if cp_solver.Value(v) == 1:
                result.append({
                    "class_id": c_id,
                    "day_of_week": d,
                    "period_number": p,
                    "subject_id": s_id,
                    "teacher_id": t_id,
                })
        return result

    def _dump_debug(self, model, cp_solver, status, x, req_by_class,
                    per_day_periods, classes, teacher_ids, days):
        print("=" * 70, flush=True)
        print("CP_SAT_DEBUG dump", flush=True)
        print(f"status: {cp_solver.StatusName(status)}", flush=True)
        print(f"model: {len(x)} boolean vars", flush=True)

        print("-" * 70, flush=True)
        print("PER-CLASS REQUIREMENT TOTALS", flush=True)
        for c in classes:
            reqs = req_by_class.get(c.id, [])
            total = sum(w for (_s, w) in reqs)
            slots = sum(len(per_day_periods[d]) for d in days)
            flag = "  <-- MISMATCH" if total != slots else ""
            print(f"  {c.class_name}-{c.division} (id={c.id}, "
                  f"teacher={c.class_teacher_id}): "
                  f"{total} periods required vs {slots} slots{flag}", flush=True)

        print("-" * 70, flush=True)
        print("PER-TEACHER LOAD (generating classes only)", flush=True)
        tlookup = {t.id: t for t in self.input.teachers}
        for t_id in sorted(teacher_ids):
            t = tlookup.get(t_id)
            if t is None:
                print(f"  teacher id={t_id}: NOT IN SolverInput.teachers", flush=True)
                continue
            total = sum(
                w for c in classes for (s_id, w) in req_by_class.get(c.id, [])
                if t_id in self.input.class_subject_teachers.get((c.id, s_id), [])
            )
            slots_per_week = sum(len(per_day_periods[d]) for d in days)
            soft_cap = t.max_lectures_per_day * len(days)
            physical_flag = "  <-- OVER PHYSICAL" if total > slots_per_week else ""
            soft_flag = ("  <-- OVER SOFT" if
                         total > soft_cap and total <= slots_per_week else "")
            print(
                f"  teacher {t_id} ({t.name}): {total} periods/week "
                f"vs physical {slots_per_week} / soft {soft_cap}"
                f"{physical_flag}{soft_flag}",
                flush=True,
            )

        print("-" * 70, flush=True)
        print("PER-TEACHER PER-DAY MINIMUM (period-1 pre-fill only)", flush=True)
        for c in classes:
            if c.class_teacher_id is not None:
                print(f"  class {c.class_name}-{c.division}: "
                      f"teacher {c.class_teacher_id} forced to period 1 on "
                      f"all {len(days)} days", flush=True)

        print("-" * 70, flush=True)
        print("PT STATUS", flush=True)
        print(f"  pt_subject_id: {self.input.pt_subject_id}", flush=True)
        pt_reqs = [
            (c.class_name, c.division, w)
            for c in classes for (s_id, w) in req_by_class.get(c.id, [])
            if s_id == self.input.pt_subject_id
        ]
        if not pt_reqs:
            print("  no PT requirements in generating classes", flush=True)
        else:
            for (cn, dv, w) in pt_reqs:
                print(f"  {cn}-{dv}: {w} PT periods/week", flush=True)
            print(f"  PT cap is 2 classes per (day, period)", flush=True)
            total_pt = sum(w for (_c, _d, w) in pt_reqs)
            total_pt_slots = sum(
                1 for d in days for p in per_day_periods[d]
            ) * 2
            flag = "  <-- PT OVER CAP" if total_pt > total_pt_slots else ""
            print(f"  total PT demand: {total_pt} vs capacity {total_pt_slots}"
                  f"{flag}", flush=True)

        print("-" * 70, flush=True)
        print("SUBJECT DAILY CAP (potential binding)", flush=True)
        for c in classes:
            for (s_id, w) in req_by_class.get(c.id, []):
                non_adj = sum(
                    (len(per_day_periods[d]) + 1) // 2 for d in days
                )
                if w > non_adj:
                    print(f"  {c.class_name}-{c.division} subject {s_id}: "
                          f"{w}/week but max non-adjacent slots = {non_adj}"
                          f"  <-- NO-ADJACENT IMPOSSIBLE", flush=True)

        print("=" * 70, flush=True)
