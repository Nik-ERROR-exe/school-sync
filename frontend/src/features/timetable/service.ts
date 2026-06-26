import {
  SchoolSettings,
  Teacher,
  Subject,
  ClassInfo,
  Constraint,
  TimetableData,
  ConstraintStatusItem
} from './types';
import {
  mockSettings,
  mockTeachers,
  mockSubjects,
  mockClasses,
  mockConstraints,
  mockTimetableData,
  mockConstraintStatuses
} from './mock';

// Utility to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const TimetableService = {
  getSettings: async (): Promise<SchoolSettings> => {
    await delay(300);
    return mockSettings;
  },
  
  saveSettings: async (settings: SchoolSettings): Promise<void> => {
    await delay(500);
    // In a real app we would save it
  },

  getTeachers: async (): Promise<Teacher[]> => {
    await delay(300);
    return mockTeachers;
  },

  getSubjects: async (): Promise<Subject[]> => {
    await delay(300);
    return mockSubjects;
  },

  getClasses: async (): Promise<ClassInfo[]> => {
    await delay(300);
    return mockClasses;
  },

  getConstraints: async (): Promise<Constraint[]> => {
    await delay(300);
    return mockConstraints;
  },

  generateTimetable: async (): Promise<TimetableData> => {
    await delay(1500); // Simulate complex generation process
    return mockTimetableData;
  },

  getGeneratedTimetable: async (): Promise<TimetableData | null> => {
    await delay(300);
    // We can simulate no timetable initially by returning null, 
    // but we'll manage this via local state or query cache for demonstration.
    return null;
  },

  getConstraintStatuses: async (): Promise<ConstraintStatusItem[]> => {
    await delay(300);
    return mockConstraintStatuses;
  }
};
