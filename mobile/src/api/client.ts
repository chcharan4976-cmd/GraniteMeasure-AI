import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

// Dynamic host: 10.0.2.2 for Android emulator, localhost for web/iOS.
// Override by setting EXPO_PUBLIC_API_URL in a .env file at the mobile/ root
// e.g.: EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
export const BASE_HOST =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');
export const API_URL = `${BASE_HOST}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Default timeout for JSON requests.
  // Image upload calls override this via { timeout: UPLOAD_TIMEOUT_MS }.
  timeout: 15000,
});

// Larger timeout constant exported for upload calls
export const UPLOAD_TIMEOUT_MS = 60_000; // 60 s for up-to-15 MB images on slow quarry networks

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().user?.token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Uniform response-error interceptor — surfaces consistent error shapes to callers
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network-level failure (no DNS, connection refused, timeout)
      console.warn('[API] Network error:', error.message, '→', error.config?.url);
    } else {
      const { status, config } = error.response;
      console.warn(`[API] HTTP ${status}:`, config?.method?.toUpperCase(), config?.url);
    }
    return Promise.reject(error);
  }
);
