import { SubstituteAssignment, SubstituteNotification } from '../types';

export const initialSubstituteAssignments: SubstituteAssignment[] = [
  {
    id: 1,
    date: '2026-06-18',
    class_id: 15, // 8A
    period_number: 3,
    original_teacher_id: 3, // Priya Madam
    substitute_teacher_id: 2, // Rahul Sir
    subject_id: 2, // Mathematics
    status: 'accepted'
  }
];

export const initialNotifications: SubstituteNotification[] = [
  {
    id: 1,
    message: 'You are assigned Class 8A Subject Maths Period 3',
    timestamp: '2026-06-18T09:15:00.000Z',
    read: true,
    class_id: 15,
    period_number: 3,
    subject_id: 2
  }
];
