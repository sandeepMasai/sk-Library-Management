import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
import { useAuth } from '../context/AuthContext';
import { SITE } from '../content/site';
import { getPlayStoreUrl } from '../lib/appDownload';

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
    <section className="bg-white py-16">
      <PageContainer size="sm">
        <GlassCard padding="none" className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent px-6 py-8 text-white">
            <p className="text-sm text-white/80">Student account</p>
            <h1 className="font-display mt-2 text-2xl font-bold">Welcome, {user.name}</h1>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted">
              Use the {SITE.name} mobile app for attendance QR scan, notifications, and your membership details.
            </p>
            <a href={getPlayStoreUrl()} className="mt-4 block" rel="noopener noreferrer">
              <Button fullWidth>Get on Google Play</Button>
            </a>
            <p className="mt-3 text-xs text-muted">
              Open the app → <strong>Scan</strong> tab → scan your library&apos;s attendance QR at check-in time.
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
        </GlassCard>
        <p className="mt-6 text-center text-sm text-muted">
          Library owner?{' '}
          <Link to="/login" className="font-semibold text-primary">
            Sign in as library
          </Link>
        </p>
      </PageContainer>
    </section>
  );
}
