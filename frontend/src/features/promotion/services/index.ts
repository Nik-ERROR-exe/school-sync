import { PromotionPreview } from '../types';
import { Student, SchoolClass } from '../../results/types';
import { ResultsService } from '../../results/services';

export const PromotionService = {
  getPromotionPreview: async (): Promise<PromotionPreview[]> => {
    const students = await ResultsService.getStudents();
    const classes = await ResultsService.getClasses();
    
    // Only preview active students
    const activeStudents = students.filter(s => s.status === 'ACTIVE');

    return activeStudents.map(student => {
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
  },

  promoteStudents: async (previews: PromotionPreview[]): Promise<boolean> => {
    const students: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
    
    const updatedStudents = students.map(student => {
      const preview = previews.find(p => p.studentId === student.id);
      if (!preview) return student;

      if (preview.action === 'graduate') {
        return {
          ...student,
          status: 'INACTIVE' as const // Graduated/Inactive
        };
      } else if (preview.action === 'promote' && preview.nextClassId !== null) {
        return {
          ...student,
          class_id: preview.nextClassId
        };
      }
      return student;
    });

    localStorage.setItem('students', JSON.stringify(updatedStudents));
    return true;
  },

  admitFirstStandardStudents: async (name: string, rollNo: string, division: 'A' | 'B'): Promise<Student> => {
    const classes = await ResultsService.getClasses();
    const class1 = classes.find(c => c.class_name === '1' && c.division === division);
    
    if (!class1) {
      throw new Error(`Standard 1 Division ${division} does not exist. Please configure classes first.`);
    }

    return await ResultsService.addStudent({
      name,
      roll_no: rollNo,
      class_id: class1.id
    });
  }
};
