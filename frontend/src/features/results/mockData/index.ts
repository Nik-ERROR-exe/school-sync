// Mock data exports for compatibility with existing services
export const initialClasses: any[] = [];
export const initialStudents: any[] = [];
export const initialSubjects: any[] = [];
export const initialExamTypes: any[] = [];
export const initialResults: any[] = [];
export const initialSubmissions: any[] = [];

export const getClassSubjects = (className: string): any[] => {
  return [];
};

export const calculateGradeAndPass = (percentage: number) => {
  if (percentage >= 90) return { grade: 'A1', passFail: 'Pass' as const };
  if (percentage >= 80) return { grade: 'A2', passFail: 'Pass' as const };
  if (percentage >= 70) return { grade: 'B1', passFail: 'Pass' as const };
  if (percentage >= 60) return { grade: 'B2', passFail: 'Pass' as const };
  if (percentage >= 50) return { grade: 'C1', passFail: 'Pass' as const };
  if (percentage >= 35) return { grade: 'C2', passFail: 'Pass' as const };
  return { grade: 'D', passFail: 'Fail' as const };
};