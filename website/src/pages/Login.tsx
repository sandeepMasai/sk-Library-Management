import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { loginLibrary, loginStudent } from '../lib/auth';
import { SUPER_ADMIN_LOGIN_PATH } from '../lib/routes';

type Tab = 'library' | 'student';

export function Login() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [tab, setTab] = useState<Tab>('library');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [libraryCode, setLibraryCode] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session =
        tab === 'library'
          ? await loginLibrary(email, password)
          : await loginStudent(mobile, pin, libraryCode);
      setSession(session);
      navigate(session.user.role === 'library' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      mode="login"
      onLogoEasterEgg={() => navigate(SUPER_ADMIN_LOGIN_PATH)}
      title="Welcome back"
      subtitle={tab === 'library' ? 'Sign in as library owner' : 'Sign in as student with mobile & PIN'}
      footer={
        <>
          New library?{' '}
          <Link to="/register" className="font-semibold text-teal-400 hover:text-teal-300">
            Create account
          </Link>
        </>
      }
    >
      <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
        {(['library', 'student'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition ${
              tab === t ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {tab === 'library' ? (
          <>
            <Input
              dark
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@library.com"
            />
            <Input
              dark
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        ) : (
          <>
            <Input
              dark
              label="Mobile number"
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile"
              hint="Registered with your library"
            />
            <Input
              dark
              label="PIN"
              type="password"
              required
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Input
              dark
              label="Library code (optional)"
              value={libraryCode}
              onChange={(e) => setLibraryCode(e.target.value.toUpperCase())}
              placeholder="e.g. LIB12AB"
              hint="Required if your mobile is registered at multiple libraries"
            />
          </>
        )}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        ) : null}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
