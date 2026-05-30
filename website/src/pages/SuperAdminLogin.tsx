import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { loginAdmin } from '../lib/auth';
import { SeoNoIndex } from '../seo/Seo';

export function SuperAdminLogin() {
  const navigate = useNavigate();
  const { setSession, user } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') navigate('/superadmin/dashboard', { replace: true });
  }, [user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const u = username.trim();
    const p = pin.trim();
    if (!u || !p) {
      setError('Enter admin username and PIN.');
      return;
    }
    setLoading(true);
    try {
      const session = await loginAdmin(u, p);
      setSession(session);
      navigate('/superadmin/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid credentials. Check ADMIN_USERNAME and ADMIN_PIN on Railway.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SeoNoIndex title="Super Admin login" />
      <div className="gradient-mesh flex min-h-screen min-h-[100dvh] items-center justify-center text-white safe-top safe-bottom">
        <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl animate-blob" />
        <div className="relative mx-auto w-full max-w-md px-4 py-12 sm:py-16">
          <div className="mb-10 flex justify-center">
            <Logo size="lg" variant="light" linkToHome={false} />
          </div>
          <p className="text-center text-xs font-bold uppercase tracking-widest text-emerald-400">Admin access</p>
          <h1 className="font-display mt-2 text-center text-2xl font-bold">Super Admin Console</h1>
          <p className="mt-2 text-center text-sm text-slate-400">Restricted area. Authorized personnel only.</p>

          <GlassCard dark padding="lg" className="mt-10">
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                dark
                label="Username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
              <Input
                dark
                label="PIN"
                type="password"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}
              <Button
                type="submit"
                fullWidth
                disabled={loading}
                className="!bg-emerald-500 !text-[#0B1220] hover:!bg-emerald-400"
              >
                {loading ? 'Signing in…' : 'Admin login'}
              </Button>
            </form>
          </GlassCard>

          <p className="mt-8 text-center text-sm text-slate-500">
            <Link to="/login" className="text-slate-400 transition hover:text-white">
              ← Library / student login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
