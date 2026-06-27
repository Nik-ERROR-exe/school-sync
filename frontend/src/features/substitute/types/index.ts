export interface SubstituteAssignment {
  id: number;
  date: string; // ISO date string (YYYY-MM-DD)
  class_id: number;
  period_number: number;
  original_teacher_id: number;
  substitute_teacher_id: number;
  subject_id: number;
  status: 'pending' | 'notified' | 'accepted' | 'declined';
}

export interface SubstituteNotification {
  id: number;
  message: string;
  timestamp: string;
  read: boolean;
  class_id: number;
  period_number: number;
  subject_id: number;
}
