import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  login: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token, isAuthenticated: !!token }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  login: (user, token) =>
    set({
      user,
      token,
      isAuthenticated: true,
      error: null,
    }),

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    }),
}));
