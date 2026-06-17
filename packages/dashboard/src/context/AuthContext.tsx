import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('[AuthContext] Checking token:', token ? 'exists' : 'not found');
    
    if (!token) {
      console.log('[AuthContext] No token, setting loading=false');
      setLoading(false);
      return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('[AuthContext] Calling /api/v1/auth/profile...');
    
    axios.get('/api/v1/auth/profile')
      .then(response => {
        console.log('[AuthContext] Profile success:', response.data);
        setUser(response.data);
        setIsAuthenticated(true);
      })
      .catch((error) => {
        console.log('[AuthContext] Profile failed:', error.response?.status || error.message);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setIsAuthenticated(false);
      })
      .finally(() => {
        console.log('[AuthContext] Setting loading=false');
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await axios.post('/api/v1/auth/login', { email, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
