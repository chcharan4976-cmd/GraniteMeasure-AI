import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/useAuthStore';

// Dynamic host resolution:
// 1. Process environment EXPO_PUBLIC_API_URL if set
// 2. Metro packager host IP from Constants.expoConfig?.hostUri (for physical devices running Expo Go)
// 3. Platform fallback (10.0.2.2 for Android emulator, 192.168.1.6 or localhost)
function resolveBaseHost(): string {
  let envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    envUrl = envUrl.replace(/\/+$/, '');
    if (envUrl.endsWith('/api/v1')) {
      return envUrl.slice(0, -'/api/v1'.length);
    }
    return envUrl;
  }

  // Auto-detect host from Metro bundler URI on physical devices
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return `http://${metroHost}:8000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  // Physical iOS default fallback to local LAN IP
  return 'http://192.168.1.6:8000';
}

export const BASE_HOST = resolveBaseHost();
export const API_URL = `${BASE_HOST}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const UPLOAD_TIMEOUT_MS = 60_000; // 60 s for high-res images on field cellular links

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().user?.token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ClassifiedError {
  type:
    | 'DEVICE_OFFLINE'
    | 'SERVER_UNREACHABLE'
    | 'TIMEOUT'
    | 'IMAGE_REJECTED'
    | 'DUPLICATE_IMAGE'
    | 'SESSION_NOT_FOUND'
    | 'SERVER_ERROR'
    | 'CLIENT_ERROR'
    | 'UNKNOWN';
  messageEn: string;
  messageTe: string;
  isRetryable: boolean;
  statusCode?: number;
  details?: any;
}

export function classifyApiError(error: any): ClassifiedError {
  if (!error) {
    return {
      type: 'UNKNOWN',
      messageEn: 'An unexpected error occurred.',
      messageTe: 'ఊహించని లోపం జరిగింది.',
      isRetryable: true,
    };
  }

  // Axios network error / timeout
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      type: 'TIMEOUT',
      messageEn: 'Request timed out. Quarry connection may be slow.',
      messageTe: 'సమయం మించిపోయింది. నెట్‌వర్క్ నెమ్మదిగా ఉండవచ్చు.',
      isRetryable: true,
    };
  }

  if (!error.response) {
    // Distinguish server unreachable vs device offline
    return {
      type: 'SERVER_UNREACHABLE',
      messageEn: 'Server unavailable. Photos saved locally on this device.',
      messageTe: 'సర్వర్ అందుబాటులో లేదు. ఫోటోలు ఈ పరికరంలో భద్రపరచబడ్డాయి.',
      isRetryable: true,
    };
  }

  const status = error.response.status;
  const data = error.response.data;

  if (status === 422 && data?.detail?.error_code === 'EVIDENCE_REJECTED_UNRELATED') {
    return {
      type: 'IMAGE_REJECTED',
      messageEn: data.detail.message || 'Image rejected: Does not appear to be a granite block.',
      messageTe: data.detail.message_te || 'ఈ ఫోటోలో గ్రానైట్ రాయి కనిపించడం లేదు.',
      isRetryable: false,
      statusCode: 422,
      details: data.detail,
    };
  }

  if (status === 409) {
    const errCode = data?.detail?.error_code || 'DUPLICATE_IMAGE';
    const isNear = errCode === 'NEAR_DUPLICATE_IMAGE';
    return {
      type: 'DUPLICATE_IMAGE',
      messageEn:
        data?.detail?.message ||
        (isNear
          ? 'Near-duplicate image rejected. Please capture a different viewpoint angle.'
          : 'Exact duplicate image rejected: This photograph has already been uploaded for this block.'),
      messageTe:
        isNear
          ? 'ఇది ఇప్పటికే ఉన్న ఫోటోతో సమానంగా ఉంది. దయచేసి వేరే కోణం నుండి తీయండి.'
          : 'ఈ ఫోటో ఇప్పటికే భద్రపరచబడింది. దయచేసి వేరే కోణం నుండి తీయండి.',
      isRetryable: false,
      statusCode: 409,
      details: data?.detail,
    };
  }

  if (status === 404) {
    return {
      type: 'SESSION_NOT_FOUND',
      messageEn: 'Capture session or block record was not found on server.',
      messageTe: 'సర్వర్‌లో సెషన్ లేదా రాయి రికార్డు కనుగొనబడలేదు.',
      isRetryable: false,
      statusCode: 404,
    };
  }

  if (status >= 500) {
    return {
      type: 'SERVER_ERROR',
      messageEn: `Server error (${status}). Analysis engine may be busy.`,
      messageTe: `సర్వర్ లోపం (${status}). కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.`,
      isRetryable: true,
      statusCode: status,
    };
  }

  return {
    type: 'CLIENT_ERROR',
    messageEn: data?.detail || `Request error (${status}).`,
    messageTe: `అభ్యర్థన లోపం (${status}).`,
    isRetryable: false,
    statusCode: status,
    details: data,
  };
}
