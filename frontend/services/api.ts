import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { resolveApiBaseUrl } from '../constants/apiUrl';
import { logoutAndClearAuth, refreshAccessToken } from './authSession';
import { formatReachabilityError, isNetworkFailure } from './networkError';

/**
 * Central API client (Axios)
 * - Attaches Bearer token from Zustand (persisted to AsyncStorage)
 * - Single in-flight refresh with queued retries on 401
 */

export type ApiError = {
  status?: number;
  message: string;
  details?: Record<string, unknown>;
};

export const api = axios.create({
  timeout: 30_000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let refreshWaiters: Array<{
  resolve: (token: string) => void;
  reject: (err: ApiError) => void;
}> = [];

function flushRefreshQueue(token: string | null, error: ApiError | null) {
  const waiters = refreshWaiters;
  refreshWaiters = [];
  waiters.forEach((w) => {
    if (token) w.resolve(token);
    else w.reject(error || { message: 'Session expired' });
  });
}

function isAuthRefreshUrl(url: string | undefined) {
  return String(url || '').includes('/api/auth/refresh');
}

function isAuthLoginUrl(url: string | undefined) {
  return String(url || '').includes('/api/auth/login') || String(url || '').includes('/api/admin/login');
}

async function enqueueRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshWaiters.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const token = await refreshAccessToken();
    flushRefreshQueue(token, null);
    return token;
  } catch (e) {
    const apiError: ApiError = {
      status: 401,
      message: e instanceof Error ? e.message : 'Refresh failed',
    };
    flushRefreshQueue(null, apiError);
    logoutAndClearAuth('refresh_failed');
    throw apiError;
  } finally {
    isRefreshing = false;
  }
}

api.interceptors.request.use((config) => {
  config.baseURL = resolveApiBaseUrl();
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

    const originalRequest = err.config as RetryConfig | undefined;

    if (status === 401 && originalRequest) {
      const url = originalRequest.url;

      if (isAuthLoginUrl(url) || isAuthRefreshUrl(url)) {
        if (isAuthRefreshUrl(url)) {
          logoutAndClearAuth('refresh_endpoint_401');
        }
        const apiError: ApiError = { status, message, details };
        return Promise.reject(apiError);
      }

      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const nextToken = await enqueueRefresh();
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${nextToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          return Promise.reject(refreshErr);
        }
      }

      logoutAndClearAuth('retry_still_401');
    }

    const apiError: ApiError = {
      status,
      message: !status && isNetworkFailure(err) ? formatReachabilityError(err) : message,
      details,
    };
    return Promise.reject(apiError);
  }
);

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
