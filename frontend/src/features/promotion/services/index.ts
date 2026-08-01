import { PromotionPreview, PromotionSummaryItem } from '../types';
import { studentApi, Student } from '../../../api/students';
import { classApi, Class } from '../../../api/classes';
import { promotionApi } from '../../../api/promotion';

export const PromotionService = {
  getPromotionPreview: async (): Promise<PromotionPreview[]> => {
    try {
      // Try to get data from backend first
      const data = await promotionApi.getPreview();

      // Map backend response to frontend format
      return data.map(item => ({
        studentId: item.student_id,
        studentName: item.student_name,
        rollNo: item.roll_no,
        currentClassId: 0,
        currentClassName: item.current_class.replace(/[^0-9]/g, ''),
        currentDivision: item.current_class.replace(/[0-9]/g, ''),
        nextClassId: item.next_class_id || null,
        nextClassName: item.next_class,
        action: item.action
      }));
    } catch (error) {
      console.error('Failed to get promotion preview from backend, using fallback:', error);
      return this.getPromotionPreviewFallback();
    }
  },

  getPromotionSummary: async (): Promise<PromotionSummaryItem[]> => {
    return promotionApi.getSummary();
  },

  // Keep existing fallback logic
  getPromotionPreviewFallback: async (): Promise<PromotionPreview[]> => {
    try {
      const students = await studentApi.getStudents();
      const classes = await classApi.getClasses();
      
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
      // Try to use backend API first
      const result = await promotionApi.executePromotion();
      console.log('Promotion result:', result);
      return true;
    } catch (error) {
      console.error('Failed to promote students via backend, using fallback:', error);
      return this.promoteStudentsFallback(previews);
    }
  },

  // Keep existing promoteStudents logic as fallback
  promoteStudentsFallback: async (previews: PromotionPreview[]): Promise<boolean> => {
    try {
      const students = await studentApi.getStudents();
      
      for (const student of students) {
        const preview = previews.find(p => p.studentId === student.id);
        if (!preview) continue;

        if (preview.action === 'graduate') {
          continue;
        } else if (preview.action === 'promote' && preview.nextClassId !== null) {
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
      // Try to use backend API first
      const student = await promotionApi.admitStudent(name, rollNo, division);
      return student;
    } catch (error) {
      console.error('Failed to admit student via backend, using fallback:', error);
      return this.admitFirstStandardStudentsFallback(name, rollNo, division);
    }
  },

  // Keep existing admit logic as fallback - FIXED
  admitFirstStandardStudentsFallback: async (name: string, rollNo: string, division: 'A' | 'B'): Promise<Student> => {
    try {
      // Get all classes
      const classes = await classApi.getClasses();
      console.log('📚 All classes from fallback:', classes);
      
      // Find class 1 with the correct division
      const class1 = classes.find(c => c.class_name === '1' && c.division === division);
      
      if (!class1) {
        throw new Error(`Standard 1 Division ${division} does not exist. Please create it first.`);
      }

      console.log('📚 Found class 1:', class1);
      console.log('📚 Creating student with:', { name, rollNo, class_id: class1.id });

      // Create student using the API
      const newStudent = await studentApi.createStudent({
        name: name,
        roll_no: rollNo,
        class_id: class1.id
      });
      
      console.log('✅ Student created:', newStudent);
      return newStudent;
    } catch (error) {
      console.error('Failed to admit student in fallback:', error);
      throw error;
    }
  }
};