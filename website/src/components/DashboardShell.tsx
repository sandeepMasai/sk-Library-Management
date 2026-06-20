import { useState, type ReactNode } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { MenuIcon } from './icons/MenuIcon';

type DashboardShellProps = {
  title: string;
  sidebar: (opts: { onNavigate: () => void }) => ReactNode;
  children: ReactNode;
  theme?: 'light' | 'dark';
  shellClassName?: string;
  mobileHeaderClassName?: string;
  shellTone?: 'light' | 'dark';
};

export function DashboardShell({
  title,
  sidebar,
  children,
  theme = 'light',
  shellClassName,
  mobileHeaderClassName,
  shellTone = 'light',
}: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useBodyScrollLock(menuOpen);

  const closeMenu = () => setMenuOpen(false);
  const isDark = theme === 'dark';
  const isDarkShell = shellTone === 'dark' || isDark;
  const shellBg =
    shellClassName ?? (isDark ? 'dashboard-dark bg-[#0a0f18]' : 'bg-[var(--color-surface)]');
  const mobileHeader =
    mobileHeaderClassName ??
    (isDark
      ? 'border-white/10 bg-[#0a0f18]/90 backdrop-blur-md'
      : 'border-slate-200/80 bg-white/90 backdrop-blur-md');

  return (
    <div className={`flex min-h-screen min-h-[100dvh] ${shellBg}`}>
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw-2.5rem,17rem)] shadow-2xl transition-transform duration-200 ease-out lg:z-30 lg:shadow-none ${
          menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebar({ onNavigate: closeMenu })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-[17rem]">
        <header
          className={`sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 safe-top lg:hidden ${mobileHeader}`}
        >
          <button
            type="button"
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${
              isDarkShell
                ? 'border-white/15 bg-white/10 text-white'
                : 'border-slate-200/80 bg-white text-slate-700'
            }`}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MenuIcon open={menuOpen} />
          </button>
          <p className={`min-w-0 truncate font-semibold ${isDarkShell ? 'text-white' : 'text-slate-900'}`}>{title}</p>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
