import api from '../api';

export interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export const teacherApi = {
  // Get teacher profile
  getProfile: async (): Promise<Teacher> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  // Get all teachers (admin)
  getTeachers: async (): Promise<Teacher[]> => {
    const response = await api.get('/admin/teachers');
    return response.data;
  }
};