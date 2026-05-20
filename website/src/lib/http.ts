const REMOTE_API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  'https://sk-library-management-production.up.railway.app';

/** In dev, use Vite proxy (`/api` → Railway) to avoid browser CORS. In production, call API directly. */
export const API_URL = import.meta.env.DEV ? '' : REMOTE_API;

export type ApiEnvelope<T> = {
  success?: boolean;
  ok?: boolean;
  data?: T;
  message?: string;
};

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('sld_auth_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem('sld_auth_token', token);
  else localStorage.removeItem('sld_auth_token');
}

const REFRESH_KEY = 'sld_refresh_token';

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

type RequestInitWithRetry = RequestInit & { _authRetry?: boolean };

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const existing = getRefreshToken();
  if (!existing) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: existing }),
        });
        const body = (await res.json().catch(() => ({}))) as ApiEnvelope<{
          authToken?: string;
          accessToken?: string;
          refreshToken?: string;
        }> & { authToken?: string; accessToken?: string; refreshToken?: string };

        if (!res.ok) return null;

        const data =
          body && typeof body === 'object' && 'success' in body && body.success === true && body.data
            ? body.data
            : body;

        const nextAccess = data.authToken ?? data.accessToken;
        if (!nextAccess) return null;

        setAuthToken(nextAccess);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        return nextAccess;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

function parseApiErrorMessage(
  body: ApiEnvelope<unknown> & { message?: string; code?: string },
  status: number
): string {
  const data = body?.data;
  const dataMsg =
    data && typeof data === 'object' && !Array.isArray(data) && 'message' in data
      ? String((data as { message?: string }).message || '')
      : '';
  const msg = String(body?.message || dataMsg || '').trim();

  if (status === 401) return msg || 'Session expired. Please sign in again.';
  if (status === 402) return msg || 'Subscription expired. Choose a plan to continue.';
  if (body?.code === 'BAD_REQUEST_ERROR' || body?.code === 'RAZORPAY_AUTH_FAILED') {
    return 'Razorpay is not configured on the server. Add live API keys on Railway and redeploy the backend.';
  }
  return msg || `Request failed (${status})`;
}

export async function apiRaw<T = unknown>(path: string, init: RequestInitWithRetry = {}): Promise<T> {
  const { _authRetry, ...fetchInit } = init;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchInit,
    headers,
    credentials: 'include',
  });
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T> &
    T & { message?: string; code?: string };

  if (!res.ok) {
    if (res.status === 401 && !_authRetry) {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        return apiRaw<T>(path, { ...init, _authRetry: true });
      }
      setAuthToken(null);
      setRefreshToken(null);
      window.dispatchEvent(new CustomEvent('sld:auth-expired'));
      throw new Error(
        token
          ? 'Session expired. Please sign in again at /login (use the same URL: www or non-www).'
          : 'Not signed in. Please log in at /login before continuing.'
      );
    }
    if (res.status === 401) {
      setAuthToken(null);
      setRefreshToken(null);
      window.dispatchEvent(new CustomEvent('sld:auth-expired'));
    }
    throw new Error(parseApiErrorMessage(body, res.status));
  }

  return body as T;
}

/** Unwrap `{ success, data }` or return body as-is for `{ ok, ... }` APIs. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = await apiRaw<ApiEnvelope<T> & T>(path, init);
  if (body && typeof body === 'object' && 'success' in body && body.success === true && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}
