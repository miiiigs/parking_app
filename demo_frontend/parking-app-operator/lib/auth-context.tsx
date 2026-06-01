'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, otp: string) => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - replace with real API call
    const mockUser: User = {
      id: '1',
      email,
      name: 'Operator User',
      role: 'operator',
      lastLogin: new Date(),
    };
    setUser(mockUser);
  };

  const loginWithPhone = async (phone: string, otp: string) => {
    // Mock phone login
    const mockUser: User = {
      id: '1',
      phone,
      name: 'Operator User',
      role: 'operator',
      lastLogin: new Date(),
    };
    setUser(mockUser);
  };

  const loginWithOAuth = async (provider: string) => {
    // Mock OAuth login
    const mockUser: User = {
      id: '1',
      email: `user@${provider}.com`,
      name: 'Operator User',
      role: 'operator',
      lastLogin: new Date(),
    };
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        loginWithPhone,
        loginWithOAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
