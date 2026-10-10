import { apiClient } from './client';

export interface LoginParams {
  username: string;
  password?: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  role: string;
  full_name: string;
}

export const login = async (credentials: LoginParams): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', {
    username: credentials.username,
    password: credentials.password || 'officer123',
    role: credentials.role || 'Officer',
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};
