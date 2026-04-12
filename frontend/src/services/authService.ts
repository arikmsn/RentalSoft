import { api } from './api';
import type { User } from '../types';

export interface LoginRequest {
  username: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { tenantSlug, ...credentials } = data;
    const endpoint = tenantSlug ? `/auth/${tenantSlug}/login` : '/auth/login';
    const response = await api.post<LoginResponse>(endpoint, credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
  }): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/register', data);
    return response.data;
  },
};
