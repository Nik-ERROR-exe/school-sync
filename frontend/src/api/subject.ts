import api from '../api';

export interface Subject {
  id: number;
  subject_name: string;
  code: string;
}

export const subjectApi = {
  // Get all subjects
  getSubjects: async (): Promise<Subject[]> => {
    const response = await api.get('/admin/subjects');
    return response.data;
  },

  // Get subjects for a class
  getSubjectsByClass: async (class_id: number): Promise<Subject[]> => {
    const response = await api.get(`/admin/subjects/class/${class_id}`);
    return response.data;
  },

  // Add subject to class
  addSubjectToClass: async (class_id: number, subject_id: number): Promise<void> => {
    await api.post(`/admin/subjects/class/${class_id}?subject_id=${subject_id}`);
  },

  // Remove subject from class
  removeSubjectFromClass: async (class_id: number, subject_id: number): Promise<void> => {
    await api.delete(`/admin/subjects/class/${class_id}/subject/${subject_id}`);
  }
};