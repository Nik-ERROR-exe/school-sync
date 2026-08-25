import { ApiSlot, ApiTeacher, ApiClass, ApiSubject } from '../types';

export interface ConflictDetail {
  type: 'TEACHER_CLASH' | 'DAILY_LIMIT' | 'PT_CAPACITY' | 'NOT_QUALIFIED';
  title: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validates a single candidate slot edit/overwrite against all slots in the master timetable schedule.
 */
export function checkSlotEditConflict(
  candidateSlot: ApiSlot,
  schedule: ApiSlot[],
  teachers: ApiTeacher[],
  classes: ApiClass[],
  subjects: ApiSubject[],
  ptSubjectId: number | null
): ConflictDetail[] {
  const conflicts: ConflictDetail[] = [];

  // Free period / empty slot has no teacher constraints
  if (!candidateSlot || candidateSlot.subject_id === 0 || candidateSlot.teacher_id === 0) {
    return conflicts;
  }

  const teacher = teachers.find(t => t.id === candidateSlot.teacher_id);
  const teacherName = teacher ? teacher.name : `Teacher #${candidateSlot.teacher_id}`;

  // 1. Check Teacher Overlap / Double-Booking across classes
  const overlappingSlot = schedule.find(
    s =>
      s.teacher_id === candidateSlot.teacher_id &&
      s.day_of_week === candidateSlot.day_of_week &&
      s.period_number === candidateSlot.period_number &&
      s.class_id !== candidateSlot.class_id &&
      s.subject_id > 0
  );

  if (overlappingSlot) {
    const otherClass = classes.find(c => c.id === overlappingSlot.class_id);
    const otherClassName = otherClass
      ? `Class ${otherClass.class_name}-${otherClass.division}`
      : `Class #${overlappingSlot.class_id}`;
    const otherSubject = subjects.find(s => s.id === overlappingSlot.subject_id);
    const otherSubjName = otherSubject ? otherSubject.subject_name : `Subject #${overlappingSlot.subject_id}`;

    conflicts.push({
      type: 'TEACHER_CLASH',
      title: 'Teacher Schedule Clash',
      message: `Teacher '${teacherName}' is already scheduled to teach ${otherSubjName} in ${otherClassName} during ${candidateSlot.day_of_week} Period ${candidateSlot.period_number}. Overwriting will create a double-booking conflict.`,
      severity: 'error',
    });
  }

  // 2. Check Teacher Daily Lecture Limit
  const maxLimit = (teacher as any)?.max_lectures_per_day ?? 4;
  // Count current lectures for this teacher on this day (excluding the target slot being edited)
  const existingLecturesOnDay = schedule.filter(
    s =>
      s.teacher_id === candidateSlot.teacher_id &&
      s.day_of_week === candidateSlot.day_of_week &&
      s.subject_id > 0 &&
      !(s.class_id === candidateSlot.class_id && s.period_number === candidateSlot.period_number)
  ).length;

  const totalLecturesAfterEdit = existingLecturesOnDay + 1;
  if (totalLecturesAfterEdit > maxLimit) {
    conflicts.push({
      type: 'DAILY_LIMIT',
      title: 'Daily Lecture Limit Exceeded',
      message: `Teacher '${teacherName}' will have ${totalLecturesAfterEdit} lectures on ${candidateSlot.day_of_week}, which exceeds their maximum daily limit of ${maxLimit} lectures.`,
      severity: 'warning',
    });
  }

  // 3. Check PT Ground Capacity (Max 2 classes with PT simultaneously)
  if (ptSubjectId !== null && candidateSlot.subject_id === ptSubjectId) {
    const existingPtCount = schedule.filter(
      s =>
        s.subject_id === ptSubjectId &&
        s.day_of_week === candidateSlot.day_of_week &&
        s.period_number === candidateSlot.period_number &&
        !(s.class_id === candidateSlot.class_id)
    ).length;

    if (existingPtCount >= 2) {
      conflicts.push({
        type: 'PT_CAPACITY',
        title: 'PT Ground Capacity Limit Exceeded',
        message: `${existingPtCount} other classes are already scheduled for Physical Training (PT) during ${candidateSlot.day_of_week} Period ${candidateSlot.period_number}. Ground capacity limit is max 2 classes.`,
        severity: 'error',
      });
    }
  }

  return conflicts;
}

/**
 * Computes all conflicts across the entire schedule grouped by slot key: `classId_day_period`.
 */
export function getScheduleConflicts(
  schedule: ApiSlot[],
  teachers: ApiTeacher[],
  classes: ApiClass[],
  subjects: ApiSubject[],
  ptSubjectId: number | null
): Record<string, ConflictDetail[]> {
  const conflictMap: Record<string, ConflictDetail[]> = {};

  for (const slot of schedule) {
    if (!slot || slot.subject_id === 0 || slot.teacher_id === 0) continue;

    const slotConflicts = checkSlotEditConflict(slot, schedule, teachers, classes, subjects, ptSubjectId);
    if (slotConflicts.length > 0) {
      const key = `${slot.class_id}_${slot.day_of_week}_${slot.period_number}`;
      conflictMap[key] = slotConflicts;
    }
  }

  return conflictMap;
}
