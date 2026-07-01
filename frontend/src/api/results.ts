import api from '../api';

export interface ExamType {
  id: number;
  name: string;
  weightage: number;
}

export interface Subject {
  id: number;
  subject_name: string;
  code: string;
}

export interface ResultSubmit {
  class_id: number;
  subject_id: number;
  exam_type_id: number;
  total_marks: number;
  marks: { student_id: number; marks_obtained: number }[];
}

export interface ResultResponse {
  id: number;
  student_id: number;
  subject_id: number;
  exam_type_id: number;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  status: string;
  submitted_by_id: number;
  approved_by_id: number | null;
}

export interface ResultUpdate {
  marks_obtained: number;
  total_marks: number;
}

export const resultApi = {
  // Get exam types
  getExamTypes: async (): Promise<ExamType[]> => {
    const response = await api.get('/teacher/exam-types');
    return response.data;
  },
  
  // Get subjects for a class (teacher)
  getSubjectsByClass: async (class_id: number): Promise<Subject[]> => {
    const response = await api.get(`/teacher/subjects/by-class/${class_id}`);
    return response.data;
  },
  
  // Submit results
  submitResults: async (data: ResultSubmit): Promise<{ message: string }> => {
    const response = await api.post('/teacher/results/submit', data);
    return response.data;
  },
  
  // Get all results (admin)
  getResults: async (class_id?: number, exam_type_id?: number): Promise<ResultResponse[]> => {
    const params = new URLSearchParams();
    if (class_id) params.append('class_id', class_id.toString());
    if (exam_type_id) params.append('exam_type_id', exam_type_id.toString());
    const response = await api.get(`/admin/results?${params.toString()}`);
    return response.data;
  },
  
  // Get results by class and exam (teacher - for loading existing marks)
  getResultsByClassAndExam: async (classId: number, examTypeId: number): Promise<{ [key: number]: number }> => {
    try {
      const response = await api.get(`/teacher/results/class/${classId}/exam/${examTypeId}`);
      return response.data;
    } catch {
      return {};
    }
  },
  
  // Update result (admin auto-save)
  updateResult: async (id: number, data: ResultUpdate): Promise<{ message: string }> => {
    const response = await api.put(`/admin/results/${id}`, data);
    return response.data;
  },
  
  // Approve result (admin)
  approveResult: async (id: number): Promise<{ message: string }> => {
    const response = await api.put(`/admin/results/${id}/approve`);
    return response.data;
  },
  
  // Reject result (admin)
  rejectResult: async (id: number): Promise<{ message: string }> => {
    const response = await api.put(`/admin/results/${id}/reject`);
    return response.data;
  }
};