import api from '../../../api';
import { SubstituteAssignment, AffectedPeriod, AvailableTeacher } from '../types';

interface AvailableTeachersResponse {
  class_id: number;
  class_name: string;
  division: string;
  subject_id: number;
  subject_name: string | null;
  available_teachers: AvailableTeacher[];
}

export const SubstituteService = {
  getAssignments: async (role?: string): Promise<SubstituteAssignment[]> => {
    const url = role === 'ADMIN'
      ? '/admin/substitute'
      : '/teacher/timetable/substitutions';
    const response = await api.get(url);
    return response.data;
  },

  getAffectedPeriods: async (
    date: string,
    absentTeacherId: number
  ): Promise<{
    class_id: number;
    class_name: string;
    division: string;
    subject_id: number;
    subject_name: string | null;
    period_number: number;
  }[]> => {
    const response = await api.get('/admin/substitute/affected-periods', {
      params: { date, absent_teacher_id: absentTeacherId }
    });
    return response.data;
  },

  getFutureAffectedPeriods: async (
    absentTeacherId: number,
    dayOfWeek: string
  ): Promise<{
    class_id: number;
    class_name: string;
    division: string;
    subject_id: number;
    subject_name: string | null;
    period_number: number;
    day_of_week: string;
  }[]> => {
    const response = await api.get('/admin/substitute/affected-periods', {
      params: { absent_teacher_id: absentTeacherId, day_of_week: dayOfWeek }
    });
    return response.data;
  },

  getAvailableTeachers: async (
    date: string,
    periodNumber: number,
    absentTeacherId: number
  ): Promise<AvailableTeachersResponse> => {
    const response = await api.get('/admin/substitute/available', {
      params: {
        date,
        period_number: periodNumber,
        absent_teacher_id: absentTeacherId
      }
    });
    return response.data;
  },

  getAvailableTeachersForFutureSlot: async (
    classId: number,
    dayOfWeek: string,
    period: number,
    subjectId: number,
    excludeTeacherId: number
  ): Promise<{
    class_id: number;
    day_of_week: string;
    period_number: number;
    subject_id: number;
    available_teachers: AvailableTeacher[];
  }> => {
    const response = await api.get('/admin/substitute/available-teachers', {
      params: {
        class_id: classId,
        day_of_week: dayOfWeek,
        period,
        subject_id: subjectId,
        exclude_teacher_id: excludeTeacherId
      }
    });
    return response.data;
  },

  assignSubstitute: async (
    date: string,
    periodNumber: number,
    classId: number,
    subjectId: number,
    originalTeacherId: number,
    substituteTeacherId: number
  ): Promise<SubstituteAssignment> => {
    const response = await api.post('/admin/substitute/', {
      date,
      period_number: periodNumber,
      class_id: classId,
      subject_id: subjectId,
      original_teacher_id: originalTeacherId,
      substitute_teacher_id: substituteTeacherId
    });
    return response.data;
  },

  assignFutureSubstitutes: async (
    originalTeacherId: number,
    assignments: {
      class_id: number;
      subject_id: number;
      day_of_week: string;
      period_number: number;
      substitute_teacher_id: number;
    }[]
  ): Promise<SubstituteAssignment[]> => {
    const response = await api.post('/admin/substitute/assign', {
      original_teacher_id: originalTeacherId,
      assignments
    });
    return response.data;
  },

  getNotifications: async (): Promise<any[]> => {
    const response = await api.get('/teacher/timetable/substitutions');
    return response.data;
  },

  markNotificationAsRead: async (id: number): Promise<any> => {
    const response = await api.put(`/notifications/${id}`);
    return response.data;
  }
};