import api from '../api';

export interface PromotionPreview {
  student_id: number;
  roll_no: string;
  student_name: string;
  current_class: string;
  movement: string;
  next_class: string;
  action: 'promote' | 'graduate';
  next_class_id?: number | null;
}

export interface PromotionResult {
  message: string;
  promoted_count: number;
  graduated_count: number;
}

export const promotionApi = {
  // Get promotion preview
  getPreview: async (): Promise<PromotionPreview[]> => {
    const response = await api.get('/admin/promotion/preview');
    return response.data;
  },

  // Execute promotion
  executePromotion: async (): Promise<PromotionResult> => {
    const response = await api.post('/admin/promotion/execute');
    return response.data;
  },

  // Admit new student to class 1
  admitStudent: async (name: string, rollNo: string, division: 'A' | 'B'): Promise<any> => {
    // First get class 1 with the division
    const classesRes = await api.get('/admin/classes/');
    const classes = classesRes.data;
    const class1 = classes.find((c: any) => c.class_name === '1' && c.division === division);
    
    if (!class1) {
      throw new Error('Class 1 not found');
    }

    const response = await api.post('/admin/students/', {
      name: name,
      roll_no: rollNo,
      class_id: class1.id
    });
    return response.data;
  }
};