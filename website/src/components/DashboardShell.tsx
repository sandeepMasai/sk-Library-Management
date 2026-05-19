import { useState, type ReactNode } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { MenuIcon } from './icons/MenuIcon';

type DashboardShellProps = {
  title: string;
  sidebar: (opts: { onNavigate: () => void }) => ReactNode;
  children: ReactNode;
};

export function DashboardShell({ title, sidebar, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useBodyScrollLock(menuOpen);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-slate-100">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw-2.5rem,17rem)] transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-64 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebar({ onNavigate: closeMenu })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 safe-top lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MenuIcon open={menuOpen} />
          </button>
          <p className="min-w-0 truncate font-semibold text-slate-900">{title}</p>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
