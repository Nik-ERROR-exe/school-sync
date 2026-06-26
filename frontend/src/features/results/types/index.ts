export interface SchoolClass {
  id: number;
  class_name: string; // '1' to '10'
  division: string;   // 'A', 'B'
  class_teacher_id?: number;
}

export interface Subject {
  id: number;
  subject_name: string;
  code: string;
}

export interface Student {
  id: number;
  roll_no: string;
  name: string;
  class_id: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ExamType {
  id: number;
  name: string; // 'Unit Test 1', 'Unit Test 2', 'Semester 1', 'Semester 2'
  weightage: number;
}

export interface Result {
  id: number;
  student_id: number;
  subject_id: number;
  exam_type_id: number;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  status: 'pending' | 'submitted' | 'approved';
  submitted_by_id: number;
  approved_by_id?: number;
}

// Flat structure for the spreadsheet editing grid
export interface StudentMarksRow {
  studentId: number;
  rollNo: string;
  studentName: string;
  marks: { [subjectId: number]: number }; // subjectId -> marks_obtained
  total: number;
  percentage: number;
  grade: string;
  passFail: 'Pass' | 'Fail';
  status: 'pending' | 'submitted' | 'approved';
}

export interface ResultSubmission {
  id: number;
  teacher_name: string;
  class_id: number;
  class_name: string;
  division: string;
  exam_type_id: number;
  exam_type_name: string;
  submission_date: string;
  status: 'pending' | 'approved';
  results: Result[];
}
