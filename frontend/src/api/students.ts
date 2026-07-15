import api from '../api';

export interface Student {
  id: number;
  roll_no: string;
  name: string;
  class_id: number;
}

export interface StudentCreate {
  roll_no: string;
  name: string;
  class_id: number;
}

export interface StudentUpdate {
  roll_no?: string;
  name?: string;
  class_id?: number;
}

export const studentApi = {
  // Get all students - uses teacher endpoint if class_id provided
  getStudents: async (class_id?: number, search?: string): Promise<Student[]> => {
    // If class_id is provided, use teacher endpoint (for teacher view)
    if (class_id) {
      const response = await api.get(`/teacher/students/by-class/${class_id}`);
      return response.data;
    }
    
    // Otherwise use admin endpoint (for admin view)
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const response = await api.get(`/admin/students?${params.toString()}`);
    return response.data;
  },
  
  // Get a single student
  getStudent: async (id: number): Promise<Student> => {
    const response = await api.get(`/admin/students/${id}`);
    return response.data;
  },
  
  // Create a student
  createStudent: async (data: StudentCreate): Promise<Student> => {
    const response = await api.post('/admin/students', data);
    return response.data;
  },
  
  // Update a student
  updateStudent: async (id: number, data: StudentUpdate): Promise<Student> => {
    const response = await api.put(`/admin/students/${id}`, data);
    return response.data;
  },
  
  // Delete a student
  deleteStudent: async (id: number): Promise<void> => {
    await api.delete(`/admin/students/${id}`);
  }
};