import { Navigate, useLocation } from 'react-router-dom';
import type { AuthRole } from '../lib/auth';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  roles?: AuthRole[];
};

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const loginPath = location.pathname.startsWith('/superadmin') ? '/superadmin/login' : '/login';

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/superadmin/dashboard" replace />;
    if (user.role === 'library') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
