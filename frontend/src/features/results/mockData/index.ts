import { SchoolClass, Subject, Student, ExamType, Result, ResultSubmission } from '../types';

export const initialClasses: SchoolClass[] = [];
export const initialSubjects: Subject[] = [];
export const initialExamTypes: ExamType[] = [];
export const getClassSubjects = (className: string): Subject[] => [];
export const initialStudents: Student[] = [];

export const calculateGradeAndPass = (percentage: number): { grade: string, passFail: 'Pass' | 'Fail' } => {
  if (percentage >= 90) return { grade: 'A1', passFail: 'Pass' };
  if (percentage >= 80) return { grade: 'A2', passFail: 'Pass' };
  if (percentage >= 70) return { grade: 'B1', passFail: 'Pass' };
  if (percentage >= 60) return { grade: 'B2', passFail: 'Pass' };
  if (percentage >= 50) return { grade: 'C1', passFail: 'Pass' };
  if (percentage >= 35) return { grade: 'C2', passFail: 'Pass' };
  return { grade: 'D', passFail: 'Fail' };
};

export const initialResults: Result[] = [];
export const initialSubmissions: ResultSubmission[] = [];
