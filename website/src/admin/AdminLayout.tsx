import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardShell } from '../components/DashboardShell';
import { PageLoadFallback } from '../components/PageLoadFallback';
import { SeoNoIndex } from '../seo/Seo';
import { AdminMobileNav } from './components/AdminMobileNav';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <>
      <SeoNoIndex title="Library admin" />
      <DashboardShell
        theme="light"
        shellTone="dark"
        title="Library Admin"
        shellClassName="admin-shell-bg"
        mobileHeaderClassName="admin-mobile-header"
        sidebar={({ onNavigate }) => <AdminSidebar onNavigate={onNavigate} />}
      >
        <div className="admin-dashboard-bg">
          <div
            className="pointer-events-none absolute -right-20 top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-blob"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-16 top-[45%] h-64 w-64 rounded-full bg-accent/25 blur-3xl animate-blob-slow"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-10 right-[20%] h-52 w-52 rounded-full bg-primary/20 blur-3xl animate-blob-delayed"
            aria-hidden
          />
          <div className="relative z-[1]">
            <Suspense fallback={<PageLoadFallback />}>
              <Outlet />
            </Suspense>
            <AdminMobileNav />
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
