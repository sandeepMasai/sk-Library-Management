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

export async function apiRaw<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T> & T & { message?: string };

  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`);
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
