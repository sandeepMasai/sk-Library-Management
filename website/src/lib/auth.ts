import { apiFetch, setAuthToken, setRefreshToken } from './http';

export type AuthRole = 'admin' | 'library' | 'student';

export type AuthUser = {
  id: string;
  role: AuthRole;
  name: string;
  username?: string;
  email?: string;
  mobile?: string;
  libraryCode?: string;
  ownerName?: string;
  city?: string;
  state?: string;
  plan?: string;
  currentPlanKey?: string;
  subscriptionStatus?: string;
  library?: { libraryName?: string; logoUrl?: string | null };
};

export type AuthSession = {
  user: AuthUser;
  authToken: string;
  refreshToken?: string;
  libraryCode?: string;
};

function unwrapSession(raw: unknown): AuthSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const data = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : o;
  const user = data.user;
  const authToken = (data.authToken ?? data.accessToken) as string | undefined;
  const refreshToken = data.refreshToken as string | undefined;
  if (!user || typeof user !== 'object' || !authToken) return null;
  return {
    user: user as AuthUser,
    authToken,
    refreshToken,
    libraryCode: (data.libraryCode as string) ?? (user as AuthUser).libraryCode,
  };
}

export async function loginLibrary(email: string, password: string): Promise<AuthSession> {
  const raw = await apiFetch<unknown>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ role: 'library', email: email.trim().toLowerCase(), password }),
  });
  const session = unwrapSession(raw);
  if (!session) throw new Error('Invalid login response');
  applySessionTokens(session);
  return session;
}

export async function loginAdmin(username: string, pin: string): Promise<AuthSession> {
  const raw = await apiFetch<unknown>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), pin }),
  });
  const session = unwrapSession(raw);
  if (!session) throw new Error('Invalid login response');
  session.user.role = 'admin';
  applySessionTokens(session);
  return session;
}

export async function loginStudent(mobile: string, pin: string, libraryCode?: string): Promise<AuthSession> {
  const body: Record<string, string> = {
    role: 'student',
    usernameOrMobile: mobile.replace(/\D/g, '').slice(-10),
    pin,
  };
  if (libraryCode?.trim()) body.libraryCode = libraryCode.trim().toUpperCase();
  const raw = await apiFetch<unknown>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const session = unwrapSession(raw);
  if (!session) throw new Error('Invalid login response');
  applySessionTokens(session);
  return session;
}

function applySessionTokens(session: AuthSession) {
  setAuthToken(session.authToken);
  if (session.refreshToken) setRefreshToken(session.refreshToken);
}

export async function sendRegisterOtp(email: string): Promise<{ resendAfterSeconds?: number }> {
  const raw = await apiFetch<{ resendAfterSeconds?: number } & { ok?: boolean }>(
    '/api/auth/library-register/send-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    }
  );
  return { resendAfterSeconds: raw.resendAfterSeconds };
}

export async function verifyRegisterOtp(
  email: string,
  otp: string
): Promise<{ registrationToken: string }> {
  const data = await apiFetch<{ registrationToken?: string }>('/api/auth/library-register/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.replace(/\D/g, '').slice(0, 6) }),
  });
  if (!data.registrationToken) throw new Error('Verification incomplete. Try again.');
  return { registrationToken: data.registrationToken };
}

export type RegisterLibraryPayload = {
  libraryName: string;
  ownerName: string;
  email: string;
  password: string;
  city: string;
  state: string;
  place: string;
  pincode: string;
  phone?: string;
  emailVerificationToken: string;
};

export async function registerLibrary(payload: RegisterLibraryPayload): Promise<AuthSession> {
  const raw = await apiFetch<unknown>('/api/auth/register-library', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const session = unwrapSession(raw);
  if (!session) throw new Error('Invalid registration response');
  applySessionTokens(session);
  return session;
}

export async function bulkCreateSeats(totalSeats: number): Promise<void> {
  await apiFetch('/api/seats/bulk-create', {
    method: 'POST',
    body: JSON.stringify({ totalSeats, spaceId: null }),
  });
}

export function logout() {
  setAuthToken(null);
  setRefreshToken(null);
  try {
    localStorage.removeItem('sld_user');
    localStorage.removeItem('sld_library_code');
  } catch {
    /* ignore */
  }
}

export function persistSession(session: AuthSession) {
  applySessionTokens(session);
  localStorage.setItem('sld_user', JSON.stringify(session.user));
  if (session.libraryCode) localStorage.setItem('sld_library_code', session.libraryCode);
}

export function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('sld_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
