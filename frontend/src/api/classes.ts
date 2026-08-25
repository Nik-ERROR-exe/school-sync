import api from '../api';

export interface Class {
  id: number;
  class_name: string;
  division: string;
}

export interface TeacherClassSubject {
  id: number;
  teacher_id: number;
  class_id: number;
  subject_id: number;
}

export const classApi = {
  // Get all classes
  getClasses: async (): Promise<Class[]> => {
    const response = await api.get('/teacher/classes');
    return response.data;
  },
  
  // Get teacher's classes
  getMyClasses: async (): Promise<Class[]> => {
    const response = await api.get('/teacher/classes/my-classes');
    return response.data;
  }
};