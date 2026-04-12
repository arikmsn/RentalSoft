import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data as any;
    const url = error.config?.url || '';
    
    const isSessionExpired = status === 401 && data?.status === 'session_expired';
    const isLoginRequest = url.includes('/auth/login');

    // Only redirect for session_expired on API calls (not login form)
    if (isSessionExpired && !isLoginRequest && !isRedirecting) {
      isRedirecting = true;
      useAuthStore.getState().logout();
      window.location.href = `/login?reason=session_expired&message=${encodeURIComponent('המערכת עודכנה, נא להתחבר מחדש')}`;
    }
    return Promise.reject(error);
  }
);

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    const status = error.response?.status;
    
    if (status === 401 || status === 400) {
      if (data?.status === 'session_expired') {
        return 'המערכת עודכנה, נא להתחבר מחדש';
      }
      return data?.message || 'שם משתמש או סיסמה שגויים';
    }
    if (error.response) {
      return data?.message || 'Server error';
    } else if (error.request) {
      return 'Network error';
    }
  }
  return 'An unexpected error occurred';
};
