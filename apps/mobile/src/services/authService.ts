import apiClient from './api';
import { User } from '@/store';

/**
 * Auth Service - Authentication and user management
 */

export const authService = {
  /**
   * Login user
   */
  login: (email: string, password: string) =>
    apiClient.post<{ user: User; token: string }>('/auth/login', {
      email,
      password,
    }),

  /**
   * Register new user
   */
  register: (email: string, password: string, name: string) =>
    apiClient.post<{ user: User; token: string }>('/auth/register', {
      email,
      password,
      name,
    }),

  /**
   * Get current user
   */
  getCurrentUser: () => apiClient.get<User>('/auth/me'),

  /**
   * Update user profile
   */
  updateProfile: (data: Partial<User>) =>
    apiClient.patch<User>('/auth/profile', data),

  /**
   * Logout
   */
  logout: () => apiClient.post('/auth/logout'),

  /**
   * Refresh token
   */
  refreshToken: () => apiClient.post<{ token: string }>('/auth/refresh'),
};

export default authService;
