import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
import { useAuth } from '../context/AuthContext';
import { SITE } from '../content/site';
import { getPlayStoreUrl } from '../lib/appDownload';

function formatDate(iso: string | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

  const expiryLabel = formatDate(user.expiryDate);
  const isExpired = user.expiryDate ? new Date(user.expiryDate).getTime() < Date.now() : false;

  return (
    <section className="bg-white py-16">
      <PageContainer size="sm">
        <GlassCard padding="none" className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent px-6 py-8 text-white">
            <p className="text-sm text-white/80">Student account</p>
            <h1 className="font-display mt-2 text-2xl font-bold">Welcome, {user.name}</h1>
          </div>
          <div className="p-6">
            {user.library?.libraryName ? (
              <p className="text-sm">
                <span className="text-muted">Library: </span>
                <span className="font-semibold">{user.library.libraryName}</span>
              </p>
            ) : null}
            <p className="mt-2 text-sm">
              <span className="text-muted">Mobile: </span>
              <span className="font-semibold">{user.mobile || user.username}</span>
            </p>
            {expiryLabel ? (
              <p className={`mt-2 text-sm ${isExpired ? 'text-rose-600' : ''}`}>
                <span className="text-muted">Membership expires: </span>
                <span className="font-semibold">{expiryLabel}</span>
                {isExpired ? <span className="ml-2 text-xs font-bold">(Expired)</span> : null}
              </p>
            ) : null}
            {user.feeStatus ? (
              <p className="mt-2 text-sm">
                <span className="text-muted">Fee status: </span>
                <span className="font-semibold">{user.feeStatus}</span>
              </p>
            ) : null}

            <Link to="/dashboard/renew" className="mt-6 block">
              <Button fullWidth size="lg">
                {isExpired ? 'Renew membership' : 'Extend / renew plan'}
              </Button>
            </Link>

            <p className="mt-4 text-sm text-muted">
              Request a plan extension here — same as the mobile app. Your librarian will approve it from the admin
              panel.
            </p>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-sm text-muted">
                Use the {SITE.name} mobile app for attendance QR scan and notifications.
              </p>
              <a href={getPlayStoreUrl()} className="mt-3 block" rel="noopener noreferrer">
                <Button variant="outline" fullWidth>
                  Get on Google Play
                </Button>
              </a>
              <p className="mt-3 text-xs text-muted">
                Open the app → <strong>Scan</strong> tab → scan your library&apos;s attendance QR at check-in time.
              </p>
            </div>

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
