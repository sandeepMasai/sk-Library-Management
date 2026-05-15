import axios, { AxiosError } from 'axios';
import { resolveApiBaseUrl } from '../constants/apiUrl';

/**
 * Central API client (Axios)
 *
 * Why this exists:
 * - Single place to set baseURL
 * - Automatically attach Authorization header using persisted auth state
 * - Global error handling (401 logout, 403 normalized message)
 *
 * This avoids duplicating fetch/headers/error parsing across screens/stores.
 */

export type ApiError = {
  status?: number;
  message: string;
  /** Extra fields from API error payload (`success: false` → `data`). */
  details?: Record<string, unknown>;
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 20_000,
});

/** One in-flight refresh so parallel 401s do not revoke each other's refresh tokens. */
let refreshPromise: Promise<string | null> | null = null;

function unwrapSuccessPayload<T = Record<string, unknown>>(body: unknown): T | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as { success?: boolean; data?: T };
  if (b.success === true && b.data != null) return b.data;
  return body as T;
}

// Attach Bearer token automatically from global auth state
api.interceptors.request.use((config) => {
  // Lazy-require to avoid require-cycle: store.ts <-> services/api.ts
  // This prevents uninitialized values after fast refresh / reload.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAppStore } = require('../store');
  const token = useAppStore.getState().token || useAppStore.getState().authToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<any>) => {
    const status = err.response?.status;
    const message =
      err.response?.data?.message ||
      (typeof err.message === 'string' && err.message) ||
      'Request failed';
    const errData = err.response?.data;
    const details =
      errData &&
      typeof errData === 'object' &&
      errData !== null &&
      'data' in errData &&
      errData.data != null &&
      typeof errData.data === 'object' &&
      !Array.isArray(errData.data)
        ? (errData.data as Record<string, unknown>)
        : undefined;
    const originalRequest = err.config as any;

    // Global auth handling
    if (status === 401) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useAppStore } = require('../store');
      const isRefreshRequest = String(originalRequest?.url || '').includes('/api/auth/refresh');

      if (!isRefreshRequest && !originalRequest?._retry) {
        const runRefresh = async (): Promise<string | null> => {
          const rt = useAppStore.getState().refreshToken;
          if (!rt) return null;
          const refreshResponse = await axios.post(
            `${resolveApiBaseUrl()}/api/auth/refresh`,
            { refreshToken: rt },
            { timeout: 20_000 }
          );
          const payload = unwrapSuccessPayload<{
            authToken?: string;
            accessToken?: string;
            refreshToken?: string;
          }>(refreshResponse.data);
          const nextAccessToken = payload?.authToken || payload?.accessToken || null;
          const nextRefreshToken = payload?.refreshToken || rt;
          if (!nextAccessToken) return null;
          useAppStore.setState({
            authToken: nextAccessToken,
            token: nextAccessToken,
            refreshToken: nextRefreshToken,
          });
          return nextAccessToken;
        };

        try {
          originalRequest._retry = true;
          if (!refreshPromise) {
            refreshPromise = runRefresh().finally(() => {
              refreshPromise = null;
            });
          }
          const nextAccessToken = await refreshPromise;
          if (nextAccessToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
            return api(originalRequest);
          }
        } catch {
          useAppStore.getState().logout();
          const apiError: ApiError = { status, message, details };
          return Promise.reject(apiError);
        }
      }
      // Session expired / invalid token → clear auth state
      useAppStore.getState().logout();
    }

    // For 403 we don't show UI here (keeps service UI-agnostic).
    // Callers can display `message`.

    const apiError: ApiError = { status, message, details };
    return Promise.reject(apiError);
  }
);

// Small helpers for consistent usage patterns
export const apiGet = async <T>(path: string, params?: Record<string, any>) => {
  const res = await api.get<T>(path, { params });
  return res.data;
};

export const apiPost = async <T>(path: string, body?: any, params?: Record<string, any>) => {
  const res = await api.post<T>(path, body, { params });
  return res.data;
};

export const apiPut = async <T>(path: string, body?: any) => {
  const res = await api.put<T>(path, body);
  return res.data;
};

export const apiPatch = async <T>(path: string, body?: any) => {
  const res = await api.patch<T>(path, body);
  return res.data;
};

export const apiDelete = async <T>(path: string) => {
  const res = await api.delete<T>(path);
  return res.data;
};

