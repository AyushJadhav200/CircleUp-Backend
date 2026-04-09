import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─────────────────────────────────────────────────────────────────────────────
// ⚙️  NETWORK CONFIGURATION
//    For local dev: Dynamically detect your machine's IP
//    For production: Use the Render/Cloud URL
// ─────────────────────────────────────────────────────────────────────────────
const PROD_URL = 'https://circleup-backend-1.onrender.com';

const getBaseUrl = (): string => {
  return PROD_URL;
};

const BASE_URL = getBaseUrl();
const WS_BASE = BASE_URL.replace('http', 'ws');
// ─────────────────────────────────────────────────────────────────────────────

export const API_URL = BASE_URL;
export const WS_URL = WS_BASE;
export const LOCATION_WS_URL = WS_BASE;

console.log('[CircleUp] Using API Endpoint:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, 
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

// Modern Resilience: Auto-Retry on "Network Error" (Render Cold Starts)
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const { config } = error;
    
    // Check if we should retry: Is it a network error? Haven't reached max retries?
    const isNetworkError = !error.response && error.message === 'Network Error';
    const retryCount = (config as any)._retryCount || 0;
    const MAX_RETRIES = 3;

    if (isNetworkError && retryCount < MAX_RETRIES) {
      (config as any)._retryCount = retryCount + 1;
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      
      console.log(`[CircleUp] Network Error Detected. Attempting retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api.request(config!);
    }

    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }

    console.error('[API Error Detail]', {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      code: error.code
    });
    
    return Promise.reject(error);
  }
);

export const getToken = async () => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};
