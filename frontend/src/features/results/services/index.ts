import { SchoolClass, Subject, Student, ExamType, Result, ResultSubmission, StudentMarksRow } from '../types';
import { 
  initialClasses, 
  initialSubjects, 
  initialExamTypes, 
  initialStudents, 
  initialResults, 
  initialSubmissions,
  getClassSubjects,
  calculateGradeAndPass
} from '../mockData';

// Helper to initialize localStorage
const initializeDB = () => {
  if (!localStorage.getItem('classes')) {
    localStorage.setItem('classes', JSON.stringify(initialClasses));
  }
  if (!localStorage.getItem('subjects')) {
    localStorage.setItem('subjects', JSON.stringify(initialSubjects));
  }
  if (!localStorage.getItem('examTypes')) {
    localStorage.setItem('examTypes', JSON.stringify(initialExamTypes));
  }
  if (!localStorage.getItem('students')) {
    localStorage.setItem('students', JSON.stringify(initialStudents));
  }
  if (!localStorage.getItem('results')) {
    localStorage.setItem('results', JSON.stringify(initialResults));
  }
  if (!localStorage.getItem('submissions')) {
    localStorage.setItem('submissions', JSON.stringify(initialSubmissions));
  }
};

initializeDB();

export const ResultsService = {
  // Classes
  getClasses: async (): Promise<SchoolClass[]> => {
    return JSON.parse(localStorage.getItem('classes') || '[]');
  },

  addClass: async (newClass: Omit<SchoolClass, 'id'>): Promise<SchoolClass> => {
    const classes = JSON.parse(localStorage.getItem('classes') || '[]');
    const nextId = classes.length > 0 ? Math.max(...classes.map((c: any) => c.id)) + 1 : 1;
    const addedClass = { ...newClass, id: nextId };
    classes.push(addedClass);
    localStorage.setItem('classes', JSON.stringify(classes));
    return addedClass;
  },

  // Subjects
  getSubjects: async (): Promise<Subject[]> => {
    return JSON.parse(localStorage.getItem('subjects') || '[]');
  },

  getClassSubjects: async (className: string): Promise<Subject[]> => {
    return getClassSubjects(className);
  },

  // Students
  getStudents: async (): Promise<Student[]> => {
    return JSON.parse(localStorage.getItem('students') || '[]');
  },

  addStudent: async (student: Omit<Student, 'id' | 'status'>): Promise<Student> => {
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const nextId = students.length > 0 ? Math.max(...students.map((s: any) => s.id)) + 1 : 1;
    const newStudent: Student = {
      ...student,
      id: nextId,
      status: 'ACTIVE'
    };
    students.push(newStudent);
    localStorage.setItem('students', JSON.stringify(students));
    return newStudent;
  },

  updateStudent: async (student: Student): Promise<Student> => {
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const index = students.findIndex((s: any) => s.id === student.id);
    if (index !== -1) {
      students[index] = student;
      localStorage.setItem('students', JSON.stringify(students));
      return student;
    }
    throw new Error('Student not found');
  },

  deleteStudent: async (studentId: number): Promise<boolean> => {
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const filtered = students.filter((s: any) => s.id !== studentId);
    localStorage.setItem('students', JSON.stringify(filtered));
    return true;
  },

  // Exam Types
  getExamTypes: async (): Promise<ExamType[]> => {
    return JSON.parse(localStorage.getItem('examTypes') || '[]');
  },

  // Submissions & Results
  getSubmissions: async (): Promise<ResultSubmission[]> => {
    return JSON.parse(localStorage.getItem('submissions') || '[]');
  },

  getStudentMarksRows: async (classId: number, examTypeId: number): Promise<StudentMarksRow[]> => {
    const students: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
    const results: Result[] = JSON.parse(localStorage.getItem('results') || '[]');
    const classes: SchoolClass[] = JSON.parse(localStorage.getItem('classes') || '[]');
    
    const targetClass = classes.find(c => c.id === classId);
    if (!targetClass) return [];

    const classSubjects = getClassSubjects(targetClass.class_name);
    const classStudents = students.filter(s => s.class_id === classId && s.status === 'ACTIVE');

    return classStudents.map(student => {
      const studentResults = results.filter(r => r.student_id === student.id && r.exam_type_id === examTypeId);
      
      const marks: { [subjectId: number]: number } = {};
      let total = 0;
      let maxTotal = 0;
      let status: 'pending' | 'submitted' | 'approved' = 'pending';

      classSubjects.forEach(subject => {
        const result = studentResults.find(r => r.subject_id === subject.id);
        const examType = initialExamTypes.find(et => et.id === examTypeId);
        const maxMarks = examType ? (examType.name.startsWith('Unit') ? 20 : 100) : 100;
        
        if (result) {
          marks[subject.id] = result.marks_obtained;
          total += result.marks_obtained;
          status = result.status;
        } else {
          marks[subject.id] = 0;
        }
        maxTotal += maxMarks;
      });

      const percentage = maxTotal > 0 ? parseFloat(((total / maxTotal) * 100).toFixed(2)) : 0;
      const { grade, passFail } = calculateGradeAndPass(percentage);

      return {
        studentId: student.id,
        rollNo: student.roll_no,
        studentName: student.name,
        marks,
        total,
        percentage,
        grade,
        passFail,
        status
      };
    });
  },

  saveOrSubmitResults: async (
    classId: number, 
    examTypeId: number, 
    rows: StudentMarksRow[], 
    teacherName: string, 
    teacherId: number,
    isSubmit: boolean
  ): Promise<boolean> => {
    const results: Result[] = JSON.parse(localStorage.getItem('results') || '[]');
    const submissions: ResultSubmission[] = JSON.parse(localStorage.getItem('submissions') || '[]');
    const classes: SchoolClass[] = JSON.parse(localStorage.getItem('classes') || '[]');
    const examTypes: ExamType[] = JSON.parse(localStorage.getItem('examTypes') || '[]');

    const targetClass = classes.find(c => c.id === classId);
    const targetExam = examTypes.find(e => e.id === examTypeId);
    if (!targetClass || !targetExam) return false;

    const classSubjects = getClassSubjects(targetClass.class_name);
    const status = isSubmit ? 'submitted' : 'pending';

    const newResultsList: Result[] = [];
    const targetStudentIds = rows.map(r => r.studentId);

    // Filter out old results for these students, class, and exam type
    const remainingResults = results.filter(
      r => !(targetStudentIds.includes(r.student_id) && r.exam_type_id === examTypeId)
    );

    let resultIdCounter = remainingResults.length > 0 ? Math.max(...remainingResults.map(r => r.id)) + 1 : 1;

    rows.forEach(row => {
      classSubjects.forEach(subject => {
        const marksObtained = row.marks[subject.id] || 0;
        const totalMarks = targetExam.name.startsWith('Unit') ? 20 : 100;
        const percentage = (marksObtained / totalMarks) * 100;
        const { grade } = calculateGradeAndPass(percentage);

        newResultsList.push({
          id: resultIdCounter++,
          student_id: row.studentId,
          subject_id: subject.id,
          exam_type_id: examTypeId,
          marks_obtained: marksObtained,
          total_marks: totalMarks,
          percentage,
          grade,
          status,
          submitted_by_id: teacherId
        });
      });
    });

    localStorage.setItem('results', JSON.stringify([...remainingResults, ...newResultsList]));

    if (isSubmit) {
      // Remove any existing submission record for this slot
      const filteredSubmissions = submissions.filter(
        s => !(s.class_id === classId && s.exam_type_id === examTypeId)
      );

      const nextSubId = filteredSubmissions.length > 0 ? Math.max(...filteredSubmissions.map(s => s.id)) + 1 : 1;
      
      const newSubmission: ResultSubmission = {
        id: nextSubId,
        teacher_name: teacherName,
        class_id: classId,
        class_name: targetClass.class_name,
        division: targetClass.division,
        exam_type_id: examTypeId,
        exam_type_name: targetExam.name,
        submission_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        results: newResultsList
      };

      filteredSubmissions.push(newSubmission);
      localStorage.setItem('submissions', JSON.stringify(filteredSubmissions));
    }

    return true;
  },

  approveSubmission: async (submissionId: number, adminId: number): Promise<boolean> => {
    const submissions: ResultSubmission[] = JSON.parse(localStorage.getItem('submissions') || '[]');
    const results: Result[] = JSON.parse(localStorage.getItem('results') || '[]');
    
    const subIndex = submissions.findIndex(s => s.id === submissionId);
    if (subIndex === -1) return false;

    // Set submission status to approved
    submissions[subIndex].status = 'approved';
    
    // Set matching result items to approved
    const classId = submissions[subIndex].class_id;
    const examTypeId = submissions[subIndex].exam_type_id;

    const updatedResults = results.map(r => {
      // Find matching results
      const belongsToSubmission = submissions[subIndex].results.some(sr => sr.id === r.id);
      if (belongsToSubmission || (r.exam_type_id === examTypeId && r.status === 'submitted')) {
        return {
          ...r,
          status: 'approved' as const,
          approved_by_id: adminId
        };
      }
      return r;
    });

    localStorage.setItem('submissions', JSON.stringify(submissions));
    localStorage.setItem('results', JSON.stringify(updatedResults));
    return true;
  },

  rejectSubmission: async (submissionId: number): Promise<boolean> => {
    const submissions: ResultSubmission[] = JSON.parse(localStorage.getItem('submissions') || '[]');
    const results: Result[] = JSON.parse(localStorage.getItem('results') || '[]');
    
    const subIndex = submissions.findIndex(s => s.id === submissionId);
    if (subIndex === -1) return false;

    const classId = submissions[subIndex].class_id;
    const examTypeId = submissions[subIndex].exam_type_id;

    // Reset matching results to pending (so teacher can re-edit and submit)
    const updatedResults = results.map(r => {
      const belongsToSubmission = submissions[subIndex].results.some(sr => sr.id === r.id);
      if (belongsToSubmission || (r.exam_type_id === examTypeId && r.status === 'submitted')) {
        return {
          ...r,
          status: 'pending' as const
        };
      }
      return r;
    });

    // Remove the submission record
    const updatedSubmissions = submissions.filter(s => s.id !== submissionId);

    localStorage.setItem('submissions', JSON.stringify(updatedSubmissions));
    localStorage.setItem('results', JSON.stringify(updatedResults));
    return true;
  }
};
