import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.parking.local';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, logout
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
