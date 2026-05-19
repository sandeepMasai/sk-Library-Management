import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { SITE } from '../content/site';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'library') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role === 'library') {
    return null;
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-primary to-accent px-6 py-8 text-white">
          <p className="text-sm text-white/80">Student account</p>
          <h1 className="mt-2 text-2xl font-bold">Welcome, {user.name}</h1>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted">
            Use the {SITE.name} mobile app for attendance QR scan, notifications, and your membership details.
          </p>
          {user.library?.libraryName ? (
            <p className="mt-4 text-sm">
              <span className="text-muted">Library: </span>
              <span className="font-semibold">{user.library.libraryName}</span>
            </p>
          ) : null}
          <p className="mt-2 text-sm">
            <span className="text-muted">Mobile: </span>
            <span className="font-semibold">{user.mobile || user.username}</span>
          </p>
          <Button variant="outline" className="mt-6 w-full" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Library owner?{' '}
        <Link to="/login" className="font-semibold text-primary">
          Sign in as library
        </Link>
      </p>
    </section>
  );
}
