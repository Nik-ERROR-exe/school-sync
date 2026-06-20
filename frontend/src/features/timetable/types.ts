export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface SchoolSettings {
  academicYear: string;
  workingDays: DayOfWeek[];
  schoolStartTime: string;
  schoolEndTime: string;
  periodsPerDay: number;
  periodDuration: number;
  breakDuration: number;
  saturdayHalfDay: boolean;
  saturdayPeriodCount?: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface Teacher {
  id: string;
  name: string;
  teacherId: string;
  email: string;
  subjects: string[]; // Subject IDs
  maxLecturesPerDay: number;
  maxLecturesPerWeek: number;
  availability: string;
}

export interface ClassSubjectAssignment {
  subjectId: string;
  weeklyLectures: number;
  teacherId: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  assignments: ClassSubjectAssignment[];
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  weeklyLectures: number;
  preferredPeriod: string;
  maxConsecutiveLectures: number;
}

export interface Constraint {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface TimetableSlot {
  id: string;
  classId: string;
  day: DayOfWeek;
  period: number;
  subjectId: string;
  teacherId: string;
  roomId?: string;
}

export interface TimetableData {
  slots: TimetableSlot[];
  generatedAt: string;
}

export interface ConstraintStatusItem {
  id: string;
  name: string;
  satisfied: boolean;
  count: number;
}
