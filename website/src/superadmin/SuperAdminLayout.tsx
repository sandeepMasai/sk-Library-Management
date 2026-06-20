import { Outlet } from 'react-router-dom';
import { DashboardShell } from '../components/DashboardShell';
import { SeoNoIndex } from '../seo/Seo';
import { SuperAdminTopBar } from './components/SuperAdminTopBar';
import { SuperAdminSidebar } from './SuperAdminSidebar';

export function SuperAdminLayout() {
  return (
    <>
      <SeoNoIndex title="Super Admin" />
      <DashboardShell
        theme="light"
        shellTone="dark"
        title="Super Admin"
        shellClassName="superadmin-shell-bg"
        mobileHeaderClassName="border-white/10 bg-emerald-800/90 text-white backdrop-blur-md"
        sidebar={({ onNavigate }) => <SuperAdminSidebar onNavigate={onNavigate} />}
      >
        <div className="superadmin-dashboard-bg">
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
            <SuperAdminTopBar />
            <Outlet />
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
