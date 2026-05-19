import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { NAV_LINKS } from '../content/site';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { Button } from './ui/Button';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function Header() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo size="md" />

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
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Menu
        </button>
      </div>

      {open ? (
        <nav className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                end={item.to === '/'}
                onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </NavLink>
                <button type="button" className="mt-2 text-left text-sm font-medium text-red-600" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={linkClass} onClick={() => setOpen(false)}>
                  Register library
                </NavLink>
              </>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
