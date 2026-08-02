import api from '../api';
import type { UserInfo } from '../context/AuthContext';

export const profileApi = {
  // Upload a profile photo; returns the refreshed /auth/me profile.
  uploadPhoto: async (file: File): Promise<UserInfo> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/auth/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
