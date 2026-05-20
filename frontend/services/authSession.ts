import axios from 'axios';
import { resolveApiBaseUrl } from '../constants/apiUrl';
import { clearAuthTokens, setAuthTokens } from './authTokenHolder';

const AUTH_LOG = __DEV__;

function logAuth(event: string, meta?: Record<string, unknown>) {
  if (!AUTH_LOG) return;
  // eslint-disable-next-line no-console
  console.log(`[auth] ${event}`, meta ?? '');
}

function unwrapRefreshPayload(body: unknown): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  if (!body || typeof body !== 'object') {
    return { accessToken: null, refreshToken: null };
  }
  const root = body as Record<string, unknown>;
  const data =
    root.success === true && root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const accessToken =
    (typeof data.authToken === 'string' && data.authToken) ||
    (typeof data.accessToken === 'string' && data.accessToken) ||
    (typeof data.token === 'string' && data.token) ||
    null;

  const refreshToken =
    typeof data.refreshToken === 'string' ? data.refreshToken : null;

  return { accessToken, refreshToken };
}

export function applyAuthTokensToStore(accessToken: string, refreshToken?: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAppStore } = require('../store');
  const prev = useAppStore.getState();
  const nextRefresh = refreshToken ?? prev.refreshToken ?? null;

  setAuthTokens({ accessToken, refreshToken: nextRefresh });

  useAppStore.setState({
    authToken: accessToken,
    token: accessToken,
    refreshToken: nextRefresh,
  });

  logAuth('tokens_updated', {
    hasRefresh: Boolean(nextRefresh),
    accessLen: accessToken.length,
  });
}

export async function refreshAccessToken(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAppStore } = require('../store');
  const rt = useAppStore.getState().refreshToken;
  if (!rt) {
    logAuth('refresh_skipped', { reason: 'no_refresh_token' });
    throw new Error('No refresh token');
  }

  logAuth('refresh_start');
  const refreshResponse = await axios.post(
    `${resolveApiBaseUrl()}/api/auth/refresh`,
    { refreshToken: rt },
    { timeout: 20_000 }
  );

  const { accessToken, refreshToken } = unwrapRefreshPayload(refreshResponse.data);
  if (!accessToken) {
    logAuth('refresh_failed', { reason: 'empty_access_token' });
    throw new Error('Refresh response missing access token');
  }

  applyAuthTokensToStore(accessToken, refreshToken);
  logAuth('refresh_success');
  return accessToken;
}

export function logoutAndClearAuth(reason: string) {
  logAuth('logout', { reason });
  clearAuthTokens();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAppStore } = require('../store');
  useAppStore.getState().logout();
}
