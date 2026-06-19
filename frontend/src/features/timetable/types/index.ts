export interface TimetableSlot {
  id: number;
  class_id: number; // reference to SchoolClass id
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period_number: number; // 1 to 8 (Mon-Fri), 1 to 4 (Sat)
  subject_id: number;
  teacher_id: number;
}

export interface WeeklyRequirement {
  id: number;
  class_id: number;
  subject_id: number;
  periods_per_week: number;
}

export interface SubjectMapping {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number; // Maps which teacher teaches which subject in which class
}

export interface ConstraintStatus {
  teacherConflict: { satisfied: boolean; details?: string };  // Teacher teaching 2 classes at once
  classConflict: { satisfied: boolean; details?: string };    // Class having 2 lectures at once
  teacherDailyLimit: { satisfied: boolean; details?: string }; // Teacher max lectures limit
  saturdayHalfDay: { satisfied: boolean; details?: string };   // Saturday period count <= 4
  ptConstraint: { satisfied: boolean; details?: string };      // PT ground overload (max 2 classes with PT)
  overallSatisfied: boolean;
}
