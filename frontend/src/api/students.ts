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

export interface BulkRowResult {
  row_number: number;
  roll_no?: string;
  name?: string;
  status: 'inserted' | 'skipped';
  reason?: string;
}

export interface StudentBulkUploadResponse {
  total_rows: number;
  inserted: number;
  skipped: number;
  results: BulkRowResult[];
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
  },

  // Bulk upload students from an .xlsx/.csv file
  uploadStudents: async (file: File, defaultClassId?: number): Promise<StudentBulkUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (defaultClassId) formData.append('default_class_id', String(defaultClassId));
    // Clear the instance's application/json default so axios sends multipart
    // with a browser-set boundary (otherwise FormData is JSON-serialized and
    // the server receives no `file` field -> 422).
    const response = await api.post('/admin/students/upload', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  // Download an .xlsx template for bulk upload
  downloadTemplate: async (): Promise<Blob> => {
    const response = await api.get('/admin/students/template', { responseType: 'blob' });
    return response.data;
  }
};