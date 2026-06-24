import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

export interface UserInfo {
  id: number;
  teacher_id: string | null;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (idOrEmail: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      // Token invalid or expired
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (idOrEmail: string, password: string, _rememberMe: boolean): Promise<boolean> => {
    try {
      const response = await api.post('/auth/login', { email: idOrEmail, password });
      const data = response.data;

      // Store JWT in localStorage
      localStorage.setItem('access_token', data.access_token);

      // Fetch full user profile (includes status etc.)
      await checkAuth();
      return true;
    } catch (error: any) {
      // Throw meaningful error message for the UI to show
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Login failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, checkAuth }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
