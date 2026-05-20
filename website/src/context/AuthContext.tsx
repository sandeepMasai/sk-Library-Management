import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAuthToken, getRefreshToken } from '../lib/http';
import {
  loadStoredUser,
  logout as clearAuth,
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

  useEffect(() => {
    const token = getAuthToken();
    const refresh = getRefreshToken();
    const stored = loadStoredUser();
    if (stored && (token || refresh)) setUser(stored);
    setIsLoading(false);

    const onExpired = () => {
      clearAuth();
      setUser(null);
    };
    window.addEventListener('sld:auth-expired', onExpired);
    return () => window.removeEventListener('sld:auth-expired', onExpired);
  }, []);

  const setSession = useCallback((session: AuthSession) => {
    persistSession(session);
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && (getAuthToken() || getRefreshToken())),
      isLoading,
      setSession,
      logout,
    }),
    [user, isLoading, setSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
