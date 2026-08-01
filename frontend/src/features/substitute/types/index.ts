export interface SubstituteAssignment {
  id: number;
  date: string | null;
  day_of_week: string | null;
  class_id: number;
  subject_id: number;
  period_number: number;
  original_teacher_id: number;
  substitute_teacher_id: number;
  status: 'pending' | 'notified' | 'accepted' | 'declined';
  class_name?: string;
  division?: string;
  subject_name?: string;
  original_teacher_name?: string;
  substitute_teacher_name?: string;
}

export interface AffectedPeriod {
  class_id: number;
  class_name: string;
  division: string;
  subject_id: number;
  subject_name: string | null;
  period_number: number;
  day_of_week: string;
}

export interface AvailableTeacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  max_lectures_per_day: number;
  current_lectures_on_date: number;
  has_subject_expertise: boolean;
}

export interface PeriodWithAvailability {
  period: AffectedPeriod;
  availableTeachers: AvailableTeacher[];
  loading: boolean;
  expanded: boolean;
}