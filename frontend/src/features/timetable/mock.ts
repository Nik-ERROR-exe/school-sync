import {
  SchoolSettings,
  Subject,
  Teacher,
  ClassInfo,
  TeacherAssignment,
  Constraint,
  TimetableData,
  ConstraintStatusItem
} from './types';

export const mockSettings: SchoolSettings = {
  academicYear: '2024-2025',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  schoolStartTime: '08:00',
  schoolEndTime: '14:30',
  periodsPerDay: 8,
  periodDuration: 40,
  breakDuration: 30,
  saturdayHalfDay: true,
  saturdayPeriodCount: 4,
};

export const mockSubjects: Subject[] = [
  { id: 'sub_1', name: 'English', color: 'bg-blue-100 text-blue-800' },
  { id: 'sub_2', name: 'Maths', color: 'bg-green-100 text-green-800' },
  { id: 'sub_3', name: 'Science', color: 'bg-purple-100 text-purple-800' },
  { id: 'sub_4', name: 'PT', color: 'bg-orange-100 text-orange-800' },
  { id: 'sub_5', name: 'Computer', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'sub_6', name: 'History', color: 'bg-rose-100 text-rose-800' },
];

export const mockTeachers: Teacher[] = [
  {
    id: 't_1',
    name: 'Priya Madam',
    teacherId: 'EMP001',
    email: 'priya@amarkor.edu',
    subjects: ['sub_1'],
    maxLecturesPerDay: 6,
    maxLecturesPerWeek: 30,
    availability: 'Full Time',
  },
  {
    id: 't_2',
    name: 'Rahul Sir',
    teacherId: 'EMP002',
    email: 'rahul@amarkor.edu',
    subjects: ['sub_2'],
    maxLecturesPerDay: 6,
    maxLecturesPerWeek: 30,
    availability: 'Full Time',
  },
  {
    id: 't_3',
    name: 'Amit Sir',
    teacherId: 'EMP003',
    email: 'amit@amarkor.edu',
    subjects: ['sub_3'],
    maxLecturesPerDay: 6,
    maxLecturesPerWeek: 30,
    availability: 'Full Time',
  },
  {
    id: 't_4',
    name: 'Sports Sir',
    teacherId: 'EMP004',
    email: 'sports@amarkor.edu',
    subjects: ['sub_4'],
    maxLecturesPerDay: 8,
    maxLecturesPerWeek: 40,
    availability: 'Full Time',
  },
  {
    id: 't_5',
    name: 'Sneha Madam',
    teacherId: 'EMP005',
    email: 'sneha@amarkor.edu',
    subjects: ['sub_5', 'sub_6'],
    maxLecturesPerDay: 5,
    maxLecturesPerWeek: 25,
    availability: 'Mon-Thu',
  },
];

export const mockClasses: ClassInfo[] = [
  {
    id: 'c_1',
    name: '1A',
    assignments: [
      { subjectId: 'sub_1', weeklyLectures: 5, teacherId: 't_1' },
      { subjectId: 'sub_2', weeklyLectures: 6, teacherId: 't_2' },
      { subjectId: 'sub_3', weeklyLectures: 5, teacherId: 't_3' },
      { subjectId: 'sub_4', weeklyLectures: 2, teacherId: 't_4' },
      { subjectId: 'sub_5', weeklyLectures: 2, teacherId: 't_5' },
    ],
  },
  {
    id: 'c_2',
    name: '1B',
    assignments: [
      { subjectId: 'sub_1', weeklyLectures: 5, teacherId: 't_1' },
      { subjectId: 'sub_2', weeklyLectures: 6, teacherId: 't_2' },
      { subjectId: 'sub_3', weeklyLectures: 5, teacherId: 't_3' },
      { subjectId: 'sub_4', weeklyLectures: 2, teacherId: 't_4' },
      { subjectId: 'sub_5', weeklyLectures: 2, teacherId: 't_5' },
    ],
  },
];

export const mockAssignments: TeacherAssignment[] = [
  {
    id: 'a_1',
    teacherId: 't_2',
    subjectId: 'sub_2',
    classId: 'c_1',
    weeklyLectures: 6,
    preferredPeriod: 'Morning',
    maxConsecutiveLectures: 2,
  },
  {
    id: 'a_2',
    teacherId: 't_1',
    subjectId: 'sub_1',
    classId: 'c_1',
    weeklyLectures: 5,
    preferredPeriod: 'Any',
    maxConsecutiveLectures: 2,
  },
];

export const mockConstraints: Constraint[] = [
  {
    id: 'const_1',
    name: 'Teacher cannot teach two classes at same time',
    description: 'Prevents overlapping schedules for a single teacher.',
    enabled: true,
  },
  {
    id: 'const_2',
    name: 'Class cannot have two lectures in same period',
    description: 'Ensures a class only has one active lecture per period.',
    enabled: true,
  },
  {
    id: 'const_3',
    name: 'Teacher Max Lectures Per Day',
    description: 'Respects the daily limit set for each teacher.',
    enabled: true,
  },
  {
    id: 'const_4',
    name: 'Teacher Max Lectures Per Week',
    description: 'Respects the weekly limit set for each teacher.',
    enabled: true,
  },
  {
    id: 'const_5',
    name: 'Saturday Half Day',
    description: 'Limits Saturday schedule to defined half-day periods.',
    enabled: true,
  },
  {
    id: 'const_6',
    name: 'PT Ground Constraint',
    description: 'Maximum 2 classes can have PT simultaneously.',
    enabled: true,
  },
  {
    id: 'const_7',
    name: 'Consecutive Lecture Limit',
    description: 'Prevents teachers from exceeding max consecutive lectures.',
    enabled: true,
  },
];

// Helper to generate some random slots
const generateMockSlots = () => {
  const slots = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  
  for (const classInfo of mockClasses) {
    for (const day of days) {
      const periodsCount = day === 'Saturday' ? 4 : 8;
      for (let p = 1; p <= periodsCount; p++) {
        // Just pick a random assignment for mock data
        const assignment = classInfo.assignments[(p + (day.length)) % classInfo.assignments.length];
        
        slots.push({
          id: `slot_${classInfo.id}_${day}_${p}`,
          classId: classInfo.id,
          day: day,
          period: p,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
        });
      }
    }
  }
  return slots;
};

export const mockTimetableData: TimetableData = {
  slots: generateMockSlots(),
  generatedAt: new Date().toISOString(),
};

export const mockConstraintStatuses: ConstraintStatusItem[] = [
  { id: 'cs_1', name: 'Teacher Conflicts', satisfied: true, count: 0 },
  { id: 'cs_2', name: 'Class Conflicts', satisfied: true, count: 0 },
  { id: 'cs_3', name: 'PT Conflicts', satisfied: false, count: 1 },
  { id: 'cs_4', name: 'Saturday Violations', satisfied: true, count: 0 },
  { id: 'cs_5', name: 'Max Lecture Violations', satisfied: true, count: 0 },
];
