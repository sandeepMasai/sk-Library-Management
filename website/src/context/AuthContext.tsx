import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ensureSession, getAuthToken, getRefreshToken } from '../lib/http';
import {
  LIBRARY_LOGO_UPDATED_EVENT,
  loadStoredUser,
  logout as clearAuth,
  patchStoredUser,
  persistSession,
  type AuthSession,
  type AuthUser,
} from '../lib/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccessToken, setHasAccessToken] = useState(() => Boolean(getAuthToken()));

  const syncTokenState = useCallback(() => {
    setHasAccessToken(Boolean(getAuthToken()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = loadStoredUser();
      const refresh = getRefreshToken();
      const access = getAuthToken();

      if (stored && (access || refresh)) {
        if (!access && refresh) {
          await ensureSession();
        }
        if (!cancelled) {
          if (getAuthToken()) {
            setUser(stored);
            setHasAccessToken(true);
          } else {
            clearAuth();
            setUser(null);
            setHasAccessToken(false);
          }
        }
      }

      if (!cancelled) setIsLoading(false);
    })();

    const onExpired = () => {
      clearAuth();
      setUser(null);
      setHasAccessToken(false);
    };

    const onLogoUpdated = (event: Event) => {
      const logoUrl = (event as CustomEvent<{ logoUrl?: string }>).detail?.logoUrl;
      if (typeof logoUrl !== 'string' || !logoUrl.trim()) return;
      const next = patchStoredUser({ logoUrl });
      if (next) setUser(next);
    };

    window.addEventListener('sld:auth-expired', onExpired);
    window.addEventListener('sld:session-updated', syncTokenState);
    window.addEventListener('storage', syncTokenState);
    window.addEventListener(LIBRARY_LOGO_UPDATED_EVENT, onLogoUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('sld:auth-expired', onExpired);
      window.removeEventListener('sld:session-updated', syncTokenState);
      window.removeEventListener('storage', syncTokenState);
      window.removeEventListener(LIBRARY_LOGO_UPDATED_EVENT, onLogoUpdated);
    };
  }, [syncTokenState]);

  const setSession = useCallback((session: AuthSession) => {
    persistSession(session);
    setUser(session.user);
    setHasAccessToken(Boolean(getAuthToken()));
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setHasAccessToken(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !isLoading && Boolean(user && hasAccessToken),
      isLoading,
      setSession,
      logout,
    }),
    [user, isLoading, hasAccessToken, setSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
