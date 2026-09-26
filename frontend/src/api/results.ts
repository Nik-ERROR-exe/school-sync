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
  total_marks?: number;
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
  total_marks?: number;
}

export interface StudentResultResponse {
  student_id: number;
  roll_no: string;
  name: string;
  subjects: {
    subject_id: number;
    subject_name: string;
    marks_obtained: number | null;
    total_marks: number | null;
    percentage: number | null;
    grade: string | null;
    status: string | null;
    result_id: number | null;
  }[];
}

export const resultApi = {
  // Get exam types
  getExamTypes: async (): Promise<ExamType[]> => {
    const response = await api.get('/teacher/exam-types');
    return response.data;
  },
  
  // Get subjects for a class (teacher)
  getSubjectsByClass: async (class_id: number, exam_type_id?: number): Promise<Subject[]> => {
    const params = new URLSearchParams();
    if (exam_type_id) params.append('exam_type_id', exam_type_id.toString());
    const response = await api.get(`/teacher/subjects/by-class/${class_id}?${params.toString()}`);
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
  getResultsByClassAndExam: async (classId: number, examTypeId: number): Promise<{ students: StudentResultResponse[] }> => {
    try {
      const response = await api.get(`/teacher/results/class/${classId}/exam/${examTypeId}`);
      return response.data;
    } catch {
      return { students: [] };
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

export interface SubjectExamComponentItem {
  id: number;
  component_code: string;
  display_label: string;
  max_marks: number;
  display_order: number;
}

export interface SubjectWithComponents {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  components: SubjectExamComponentItem[];
}

export interface SubjectExamComponentCreate {
  class_name: string;
  subject_id: number;
  exam_type_id: number;
  component_code: string;
  display_label: string;
  max_marks: number;
  display_order: number;
}

export interface SubjectExamComponentUpdate {
  display_label?: string;
  max_marks?: number;
  display_order?: number;
}

export const subjectExamComponentsApi = {
  listByClass: async (
    class_name: string,
    exam_type_id: number
  ): Promise<SubjectWithComponents[]> => {
    const response = await api.get(
      `/admin/subject-exam-components/by-class/${class_name}/exam/${exam_type_id}`
    );
    return response.data;
  },
  create: async (
    data: SubjectExamComponentCreate
  ): Promise<SubjectExamComponentItem> => {
    const response = await api.post(
      '/admin/subject-exam-components/',
      data
    );
    return response.data;
  },
  update: async (
    id: number,
    data: SubjectExamComponentUpdate
  ): Promise<SubjectExamComponentItem> => {
    const response = await api.put(
      `/admin/subject-exam-components/${id}`,
      data
    );
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/subject-exam-components/${id}`);
  },
  batch: async (
    items: SubjectExamComponentCreate[]
  ): Promise<SubjectExamComponentItem[]> => {
    const response = await api.post(
      '/admin/subject-exam-components/batch',
      { items }
    );
    return response.data;
  },
};