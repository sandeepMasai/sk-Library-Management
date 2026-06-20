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

export function notifySessionUpdate() {
  window.dispatchEvent(new CustomEvent('sld:session-updated'));
}

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem('sld_auth_token', token);
  else localStorage.removeItem('sld_auth_token');
  notifySessionUpdate();
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
  notifySessionUpdate();
}

type RequestInitWithRetry = RequestInit & { _authRetry?: boolean };

let logoutBroadcast = false;

function forceLogout() {
  if (logoutBroadcast) return;
  logoutBroadcast = true;
  setTimeout(() => {
    logoutBroadcast = false;
  }, 1500);
  setAuthToken(null);
  setRefreshToken(null);
  window.dispatchEvent(new CustomEvent('sld:auth-expired'));
}

function unwrapEnvelope<T>(body: ApiEnvelope<T> & T): T {
  if (body && typeof body === 'object' && 'success' in body && body.success === true && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

let refreshInFlightInner: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const existing = getRefreshToken();
  if (!existing) return null;

  if (!refreshInFlightInner) {
    refreshInFlightInner = (async () => {
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
        }> &
          { authToken?: string; accessToken?: string; refreshToken?: string };

        if (!res.ok) {
          if (import.meta.env.DEV) {
            console.warn('[auth] refresh failed', res.status, body);
          }
          return null;
        }

        const data = unwrapEnvelope(body);
        const nextAccess = data.authToken ?? data.accessToken;
        if (!nextAccess) return null;

        setAuthToken(nextAccess);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        return nextAccess;
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[auth] refresh error', err);
        }
        return null;
      } finally {
        refreshInFlightInner = null;
      }
    })();
  }

  return refreshInFlightInner;
}

/** Restore access token from refresh token if needed. Call before protected API use. */
export async function ensureSession(): Promise<boolean> {
  if (getAuthToken()) return true;
  const next = await refreshAccessToken();
  return Boolean(next);
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
  if (body?.code === 'RAZORPAY_AUTH_FAILED' || (status === 503 && /authentication failed/i.test(msg))) {
    return (
      msg ||
      'Razorpay authentication failed. In backend/.env set matching RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET from Razorpay Dashboard (Test mode → Settings → API Keys), update VITE_RAZORPAY_KEY_ID to the same Key ID in website/.env, then restart both servers.'
    );
  }
  if (body?.code === 'BAD_REQUEST_ERROR' && /authentication failed/i.test(msg)) {
    return 'Razorpay authentication failed. Regenerate your test API key pair in Razorpay Dashboard and update backend/.env.';
  }
  return msg || `Request failed (${status})`;
}

export async function apiRaw<T = unknown>(path: string, init: RequestInitWithRetry = {}): Promise<T> {
  const { _authRetry, ...fetchInit } = init;
  const isAuthRoute = path.startsWith('/api/auth/login') || path.startsWith('/api/admin/login');

  let token = getAuthToken();
  if (!token && !isAuthRoute && !_authRetry) {
    token = (await refreshAccessToken()) || null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...fetchInit,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new Error(
      import.meta.env.DEV
        ? 'Backend is not reachable. Start it with: cd backend && npm run dev (port 1998), then try again.'
        : 'Payment server is unreachable. Please try again in a moment.'
    );
  }
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T> &
    T & { message?: string; code?: string };

  if (!res.ok) {
    const isPaymentOrRazorpay =
      path.includes('/payment/') || body?.code === 'RAZORPAY_AUTH_FAILED' || body?.code === 'BAD_REQUEST_ERROR';

    if (res.status === 401 && !_authRetry && !isAuthRoute) {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        return apiRaw<T>(path, { ...init, _authRetry: true });
      }
      if (!isPaymentOrRazorpay) {
        forceLogout();
      }
      throw new Error(
        token
          ? 'Session expired. Please sign in again (use the same site URL: www or non-www).'
          : 'Please log in as library owner before continuing.'
      );
    }

    if (res.status === 401 && _authRetry && !isPaymentOrRazorpay) {
      forceLogout();
    }

    throw new Error(parseApiErrorMessage(body, res.status));
  }

  return body as T;
}

/** Unwrap `{ success, data }` or return body as-is for `{ ok, ... }` APIs. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = await apiRaw<ApiEnvelope<T> & T>(path, init);
  return unwrapEnvelope(body);
}
