import { PromotionPreview } from '../types';
import { studentApi, Student } from '../../../api/students';
import { classApi, Class } from '../../../api/classes';

export const PromotionService = {
  getPromotionPreview: async (): Promise<PromotionPreview[]> => {
    try {
      const students = await studentApi.getStudents();
      const classes = await classApi.getClasses();
      
      // Only active students (no status field in DB, so we'll include all)
      return students.map(student => {
        const currentClass = classes.find(c => c.id === student.class_id);
        if (!currentClass) {
          return {
            studentId: student.id,
            studentName: student.name,
            rollNo: student.roll_no,
            currentClassId: student.class_id,
            currentClassName: 'Unknown',
            currentDivision: '',
            nextClassId: null,
            nextClassName: 'Graduated',
            action: 'graduate' as const
          };
        }

        const cNum = parseInt(currentClass.class_name, 10);
        const div = currentClass.division;

        if (cNum === 10) {
          return {
            studentId: student.id,
            studentName: student.name,
            rollNo: student.roll_no,
            currentClassId: student.class_id,
            currentClassName: '10',
            currentDivision: div,
            nextClassId: null,
            nextClassName: 'Graduated',
            action: 'graduate' as const
          };
        } else {
          const nextClassName = (cNum + 1).toString();
          const nextClass = classes.find(c => c.class_name === nextClassName && c.division === div);
          
          return {
            studentId: student.id,
            studentName: student.name,
            rollNo: student.roll_no,
            currentClassId: student.class_id,
            currentClassName: currentClass.class_name,
            currentDivision: div,
            nextClassId: nextClass ? nextClass.id : null,
            nextClassName: nextClass ? `${nextClass.class_name}${nextClass.division}` : `${cNum + 1}${div}`,
            action: 'promote' as const
          };
        }
      });
    } catch (error) {
      console.error('Failed to get promotion preview:', error);
      return [];
    }
  },

  promoteStudents: async (previews: PromotionPreview[]): Promise<boolean> => {
    try {
      // Get all students
      const students = await studentApi.getStudents();
      
      // Update each student's class
      for (const student of students) {
        const preview = previews.find(p => p.studentId === student.id);
        if (!preview) continue;

        if (preview.action === 'graduate') {
          // For graduation, we keep the student but don't delete
          // You can add a status field if needed
          continue;
        } else if (preview.action === 'promote' && preview.nextClassId !== null) {
          // Update student's class
          await studentApi.updateStudent(student.id, {
            class_id: preview.nextClassId
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to promote students:', error);
      return false;
    }
  },

  admitFirstStandardStudents: async (name: string, rollNo: string, division: 'A' | 'B'): Promise<Student> => {
    try {
      const classes = await classApi.getClasses();
      const class1 = classes.find(c => c.class_name === '1' && c.division === division);
      
      if (!class1) {
        throw new Error(`Standard 1 Division ${division} does not exist. Please configure classes first.`);
      }

      // Add student using the API
      const newStudent = await studentApi.createStudent({
        name,
        roll_no: rollNo,
        class_id: class1.id
      });
      
      return newStudent;
    } catch (error) {
      console.error('Failed to admit student:', error);
      throw error;
    }
  }
};