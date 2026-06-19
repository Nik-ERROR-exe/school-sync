import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserInfo {
  id: number;
  teacherId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER';
  status: 'ACTIVE' | 'INACTIVE';
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (idOrEmail: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (idOrEmail: string, password: string, rememberMe: boolean): Promise<boolean> => {
    // Trim and normalize input
    const loginId = idOrEmail.trim().toLowerCase();
    
    // Simple mock verification
    let authenticatedUser: UserInfo | null = null;
    
    if (loginId === 'admin' || loginId === 'admin@amarkor.in' || loginId === 'admin01') {
      if (password === 'admin123') {
        authenticatedUser = {
          id: 1,
          teacherId: 'ADMIN01',
          name: 'Principal Deshmukh',
          email: 'admin@amarkor.in',
          role: 'ADMIN',
          status: 'ACTIVE'
        };
      }
    } else if (
      loginId === 'teacher' || 
      loginId === 'teacher@amarkor.in' || 
      loginId === 't101' || 
      loginId === 'rahul' || 
      loginId === 'rahul@amarkor.in'
    ) {
      if (password === 'teacher123' || password === 'rahul123') {
        authenticatedUser = {
          id: 2,
          teacherId: 'T101',
          name: 'Rahul Sir (Maths)',
          email: 'rahul.desai@amarkor.in',
          role: 'TEACHER',
          status: 'ACTIVE'
        };
      }
    } else if (loginId === 'priya' || loginId === 'priya@amarkor.in' || loginId === 't102') {
      if (password === 'priya123') {
        authenticatedUser = {
          id: 3,
          teacherId: 'T102',
          name: 'Priya Madam (English)',
          email: 'priya.sharma@amarkor.in',
          role: 'TEACHER',
          status: 'ACTIVE'
        };
      }
    } else if (loginId === 'vikram' || loginId === 'vikram@amarkor.in' || loginId === 't103') {
      if (password === 'vikram123') {
        authenticatedUser = {
          id: 4,
          teacherId: 'T103',
          name: 'Vikram Sir (Science)',
          email: 'vikram.patil@amarkor.in',
          role: 'TEACHER',
          status: 'ACTIVE'
        };
      }
    }

    if (authenticatedUser) {
      const mockToken = `mock-jwt-token-for-${authenticatedUser.role}-${Date.now()}`;
      setToken(mockToken);
      setUser(authenticatedUser);

      if (rememberMe) {
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(authenticatedUser));
      } else {
        sessionStorage.setItem('token', mockToken);
        sessionStorage.setItem('user', JSON.stringify(authenticatedUser));
      }
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
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
