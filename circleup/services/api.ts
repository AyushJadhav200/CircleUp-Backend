import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─────────────────────────────────────────────────────────────────────────────
// ⚙️  CONFIGURATION
//    For local dev: Use your machine's IP (e.g., 192.168.1.6)
//    For production: Use the Render/Cloud URL
// ─────────────────────────────────────────────────────────────────────────────
// ⚙️ PRODUCTION READY CONFIGURATION
const DEFAULT_DEV_IP = '192.168.1.10'; // Your current local IP
const PROD_URL = 'https://circleup-backend.onrender.com'; // Change this to your live URL

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_DEV_IP}:8000`;
const WS_BASE = BASE_URL.replace('http', 'ws');
// ─────────────────────────────────────────────────────────────────────────────

export const API_URL = BASE_URL;
export const WS_URL = WS_BASE;
export const LOCATION_WS_URL = `${WS_BASE.replace(':8000', ':8001')}`;


console.log('[CircleUp] Backend URL:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

export const TOKEN_KEY = 'circleup_jwt_token';

// Attach JWT to every request
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Global response error handler
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    console.error('[API Error]', error.message, error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);
export const getToken = async () => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};
