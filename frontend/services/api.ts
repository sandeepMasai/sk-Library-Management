import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, resolveApiBaseUrl } from '../constants/apiUrl';
import { getAccessToken } from './authTokenHolder';
import { logoutAndClearAuth, refreshAccessToken } from './authSession';
import { formatReachabilityError, isNetworkFailure } from './networkError';

function setBearerHeader(config: InternalAxiosRequestConfig, token: string) {
  const value = `Bearer ${token}`;
  if (!config.headers) {
    config.headers = {} as InternalAxiosRequestConfig['headers'];
  }
  const headers = config.headers as Record<string, unknown> & {
    set?: (key: string, value: string) => void;
  };
  if (typeof headers.set === 'function') {
    headers.set('Authorization', value);
  } else {
    headers.Authorization = value;
    headers.authorization = value;
  }
}

/**
 * Central API client (Axios)
 * - Attaches Bearer token from Zustand (persisted to AsyncStorage)
 * - Single in-flight refresh with queued retries on 401
 */

export type ApiError = {
  status?: number;
  message: string;
  code?: string;
  membershipExpired?: boolean;
  details?: Record<string, unknown>;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  withCredentials: true,
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
  let token = getAccessToken();
  if (!token) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useAppStore } = require('../store');
      token = useAppStore.getState().token || useAppStore.getState().authToken;
    } catch {
      /* store not ready */
    }
  }
  if (token) {
    setBearerHeader(config, token);
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
    const body = err.response?.data;
    const bodyObj = body && typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
    const details =
      bodyObj &&
        "data" in bodyObj &&
        bodyObj.data != null &&
        typeof bodyObj.data === "object" &&
        !Array.isArray(bodyObj.data)
        ? (bodyObj.data as Record<string, unknown>)
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
          setBearerHeader(originalRequest, nextToken);
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
      code: bodyObj?.code ? String(bodyObj.code) : undefined,
      membershipExpired: Boolean(bodyObj?.membershipExpired),
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

export const apiPostFormData = async <T>(path: string, formData: FormData) => {
  const res = await api.post<T>(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
