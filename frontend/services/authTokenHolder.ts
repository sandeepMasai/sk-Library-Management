/**
 * In-memory access token for Axios (avoids circular store ↔ api imports).
 * Zustand persist remains source of truth; this is updated on every token change.
 */
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setAuthTokens(next: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) {
  if (next.accessToken !== undefined) {
    accessToken = next.accessToken;
  }
  if (next.refreshToken !== undefined) {
    refreshToken = next.refreshToken;
  }
}

export function clearAuthTokens() {
  accessToken = null;
  refreshToken = null;
}
