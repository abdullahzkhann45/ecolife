'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';

interface User {
  id: string;
  email: string;
  username: string;
  onboardingCompleted: boolean;
  role: string;
  gpsConsentShown: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('ecolife_token');
    const storedUser = localStorage.getItem('ecolife_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    const res = await api.post('/auth/login', { emailOrUsername, password });
    const { accessToken, user: u } = res.data;
    localStorage.setItem('ecolife_token', accessToken);
    localStorage.setItem('ecolife_user', JSON.stringify(u));
    setToken(accessToken);
    setUser(u);
    router.push(u.onboardingCompleted ? '/home' : '/onboarding');
  };

  const register = async (email: string, username: string, password: string) => {
    const res = await api.post('/auth/register', { email, username, password });
    const { accessToken, user: u } = res.data;
    localStorage.setItem('ecolife_token', accessToken);
    localStorage.setItem('ecolife_user', JSON.stringify(u));
    setToken(accessToken);
    setUser(u);
    router.push('/onboarding');
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('ecolife_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('ecolife_token');
    localStorage.removeItem('ecolife_user');
    setToken(null);
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
