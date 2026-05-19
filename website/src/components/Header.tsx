import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { NAV_LINKS } from '../content/site';
import { useAuth } from '../context/AuthContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { MenuIcon } from './icons/MenuIcon';
import { Logo } from './Logo';
import { Button } from './ui/Button';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function Header() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  useBodyScrollLock(open);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 glass safe-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Logo size="md" className="min-w-0 shrink [&_span]:hidden sm:[&_span]:inline" />

        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <>
              <Link
                to={user?.role === 'library' ? '/admin' : '/dashboard'}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {user?.name?.split(' ')[0] || 'Dashboard'}
              </Link>
              <Button variant="ghost" onClick={logout} className="!py-2">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="!py-2">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button className="!py-2.5 !px-5">Register library</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {open ? (
        <nav className="border-t border-slate-200 bg-white px-4 py-4 safe-bottom lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                end={item.to === '/'}
                onClick={close}
              >
                {item.label}
              </NavLink>
            ))}
            <hr className="my-2 border-slate-100" />
            {isAuthenticated ? (
              <>
                <NavLink
                  to={user?.role === 'library' ? '/admin' : '/dashboard'}
                  className={linkClass}
                  onClick={close}
                >
                  Dashboard
                </NavLink>
                <button
                  type="button"
                  className="mt-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={() => {
                    close();
                    logout();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                <Link to="/login" onClick={close} className="w-full">
                  <Button variant="outline" fullWidth>
                    Log in
                  </Button>
                </Link>
                <Link to="/register" onClick={close} className="w-full">
                  <Button fullWidth>Register library</Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
