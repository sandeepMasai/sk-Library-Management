import type { AuthRole } from '../store';

const AUTH_ROLES: AuthRole[] = ['admin', 'library', 'student'];

export function normalizeAuthRole(value: unknown): AuthRole | null {
  const role = String(value ?? '').trim().toLowerCase();
  if (role === 'admin' || role === 'library' || role === 'student') {
    return role;
  }
  return null;
}

export function resolveEffectiveRole(
  role: unknown,
  currentUserRole?: unknown
): AuthRole | null {
  return normalizeAuthRole(role) ?? normalizeAuthRole(currentUserRole);
}

export function isAuthRole(value: unknown): value is AuthRole {
  return AUTH_ROLES.includes(value as AuthRole);
}

export type AuthLoginPayload = {
  user: { role: AuthRole; id: string; [key: string]: unknown };
  authToken?: string | null;
  refreshToken?: string | null;
  libraryCode?: string | null;
};

/** Unwrap POST /api/auth/login and register responses (success envelope or legacy flat). */
export function unwrapAuthLoginPayload(raw: unknown): AuthLoginPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;

  if (body.success === true && body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>;
    if (data.user && typeof data.user === 'object') {
      return data as AuthLoginPayload;
    }
  }

  if (body.user && typeof body.user === 'object') {
    return body as AuthLoginPayload;
  }

  return null;
}
