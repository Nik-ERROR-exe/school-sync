import { SchoolClass, Subject, Student, ExamType, Result, ResultSubmission } from '../types';

export const initialClasses: SchoolClass[] = [];
const divisions = ['A', 'B'];
let classIdCounter = 1;

for (let c = 1; c <= 10; c++) {
  divisions.forEach(div => {
    initialClasses.push({
      id: classIdCounter++,
      class_name: c.toString(),
      division: div,
      class_teacher_id: classIdCounter % 4 === 0 ? 2 : classIdCounter % 4 === 1 ? 3 : classIdCounter % 4 === 2 ? 4 : undefined
    });
  });
}

export const initialSubjects: Subject[] = [
  { id: 1, subject_name: 'English', code: 'ENG' },
  { id: 2, subject_name: 'Mathematics', code: 'MATH' },
  { id: 3, subject_name: 'Marathi', code: 'MAR' },
  { id: 4, subject_name: 'Environmental Studies', code: 'EVS' },
  { id: 5, subject_name: 'Science', code: 'SCI' },
  { id: 6, subject_name: 'History & Civics', code: 'HIST' },
  { id: 7, subject_name: 'Geography', code: 'GEOG' },
  { id: 8, subject_name: 'Computer Studies', code: 'COMP' },
  { id: 9, subject_name: 'Physical Training', code: 'PT' }
];

export const initialExamTypes: ExamType[] = [
  { id: 1, name: 'Unit Test 1', weightage: 20 },
  { id: 2, name: 'Unit Test 2', weightage: 20 },
  { id: 3, name: 'Semester 1', weightage: 80 },
  { id: 4, name: 'Semester 2', weightage: 80 }
];

// Map of class name to subjects (Class 1-4: EVS, ENG, MATH, MAR, PT. Class 5-10: ENG, MATH, MAR, SCI, HIST, GEOG, COMP, PT)
export const getClassSubjects = (className: string): Subject[] => {
  const cNum = parseInt(className, 10);
  if (cNum <= 4) {
    return initialSubjects.filter(s => [1, 2, 3, 4, 9].includes(s.id));
  } else {
    return initialSubjects.filter(s => [1, 2, 3, 5, 6, 7, 8, 9].includes(s.id));
  }
};

export const initialStudents: Student[] = [
  // 1A
  { id: 1, roll_no: '101', name: 'Aarav Patil', class_id: 1, status: 'ACTIVE' },
  { id: 2, roll_no: '102', name: 'Ananya Shinde', class_id: 1, status: 'ACTIVE' },
  { id: 3, roll_no: '103', name: 'Kabir Joshi', class_id: 1, status: 'ACTIVE' },
  { id: 4, roll_no: '104', name: 'Sai Kulkarni', class_id: 1, status: 'ACTIVE' },
  { id: 5, roll_no: '105', name: 'Aditi More', class_id: 1, status: 'ACTIVE' },
  
  // 5A
  { id: 6, roll_no: '501', name: 'Rohan Sawant', class_id: 9, status: 'ACTIVE' },
  { id: 7, roll_no: '502', name: 'Shruti Kamble', class_id: 9, status: 'ACTIVE' },
  { id: 8, roll_no: '503', name: 'Tanmay Gawde', class_id: 9, status: 'ACTIVE' },
  { id: 9, roll_no: '504', name: 'Gauri Rane', class_id: 9, status: 'ACTIVE' },
  { id: 10, roll_no: '505', name: 'Yash Bhosale', class_id: 9, status: 'ACTIVE' },

  // 8A
  { id: 11, roll_no: '801', name: 'Pranav Deshmukh', class_id: 15, status: 'ACTIVE' },
  { id: 12, roll_no: '802', name: 'Diya Mane', class_id: 15, status: 'ACTIVE' },
  { id: 13, roll_no: '803', name: 'Atharva Salvi', class_id: 15, status: 'ACTIVE' },
  { id: 14, roll_no: '804', name: 'Nisha Thakur', class_id: 15, status: 'ACTIVE' },
  { id: 15, roll_no: '805', name: 'Omkar Jadhav', class_id: 15, status: 'ACTIVE' },

  // 10A
  { id: 16, roll_no: '1001', name: 'Siddharth Chavan', class_id: 19, status: 'ACTIVE' },
  { id: 17, roll_no: '1002', name: 'Isha Tambe', class_id: 19, status: 'ACTIVE' },
  { id: 18, roll_no: '1003', name: 'Aditya Parab', class_id: 19, status: 'ACTIVE' },
  { id: 19, roll_no: '1004', name: 'Meera Gupte', class_id: 19, status: 'ACTIVE' },
  { id: 20, roll_no: '1005', name: 'Swaroop Kadam', class_id: 19, status: 'ACTIVE' }
];

// Utility to calculate totals, pass/fail, grade
export const calculateGradeAndPass = (percentage: number): { grade: string, passFail: 'Pass' | 'Fail' } => {
  if (percentage >= 90) return { grade: 'A1', passFail: 'Pass' };
  if (percentage >= 80) return { grade: 'A2', passFail: 'Pass' };
  if (percentage >= 70) return { grade: 'B1', passFail: 'Pass' };
  if (percentage >= 60) return { grade: 'B2', passFail: 'Pass' };
  if (percentage >= 50) return { grade: 'C1', passFail: 'Pass' };
  if (percentage >= 35) return { grade: 'C2', passFail: 'Pass' };
  return { grade: 'D', passFail: 'Fail' };
};

// Generate some initial mock results
export const initialResults: Result[] = [];
export const initialSubmissions: ResultSubmission[] = [];

// Let's create an approved submission for Class 8A Semester 1 by Rahul Sir (teacherId: 2, name: Rahul Sir)
const class8ASubjects = getClassSubjects('8');
const studentIds8A = [11, 12, 13, 14, 15];

const mockResults8A: Result[] = [];

studentIds8A.forEach(studentId => {
  // Generate random marks
  class8ASubjects.forEach(subject => {
    const marks = Math.floor(Math.random() * 40) + 55; // 55 to 95
    const total = 100;
    const pct = marks;
    const { grade } = calculateGradeAndPass(pct);
    mockResults8A.push({
      id: initialResults.length + 1,
      student_id: studentId,
      subject_id: subject.id,
      exam_type_id: 3, // Semester 1
      marks_obtained: marks,
      total_marks: total,
      percentage: pct,
      grade,
      status: 'approved',
      submitted_by_id: 2, // Rahul Sir
      approved_by_id: 1   // Principal
    });
  });
});

// Let's create a pending submission for Class 5A Unit Test 1 by Priya Madam (teacherId: 3, name: Priya Madam)
const class5ASubjects = getClassSubjects('5');
const studentIds5A = [6, 7, 8, 9, 10];
const mockResults5A: Result[] = [];

studentIds5A.forEach(studentId => {
  class5ASubjects.forEach(subject => {
    const marks = Math.floor(Math.random() * 10) + 10; // 10 to 20 for unit test (out of 20)
    const total = 20;
    const pct = (marks / total) * 100;
    const { grade } = calculateGradeAndPass(pct);
    mockResults5A.push({
      id: initialResults.length + mockResults8A.length + 1,
      student_id: studentId,
      subject_id: subject.id,
      exam_type_id: 1, // Unit Test 1
      marks_obtained: marks,
      total_marks: total,
      percentage: pct,
      grade,
      status: 'submitted',
      submitted_by_id: 3, // Priya Madam
    });
  });
});

initialResults.push(...mockResults8A, ...mockResults5A);

initialSubmissions.push(
  {
    id: 1,
    teacher_name: 'Rahul Sir (Maths)',
    class_id: 15, // 8A
    class_name: '8',
    division: 'A',
    exam_type_id: 3, // Semester 1
    exam_type_name: 'Semester 1',
    submission_date: '2026-06-15',
    status: 'approved',
    results: mockResults8A
  },
  {
    id: 2,
    teacher_name: 'Priya Madam (English)',
    class_id: 9, // 5A
    class_name: '5',
    division: 'A',
    exam_type_id: 1, // Unit Test 1
    exam_type_name: 'Unit Test 1',
    submission_date: '2026-06-18',
    status: 'pending',
    results: mockResults5A
  }
);
