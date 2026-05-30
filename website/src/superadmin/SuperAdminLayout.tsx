import { Outlet } from 'react-router-dom';
import { DashboardShell } from '../components/DashboardShell';
import { SeoNoIndex } from '../seo/Seo';
import { SuperAdminSidebar } from './SuperAdminSidebar';

export function SuperAdminLayout() {
  return (
    <>
      <SeoNoIndex title="Super Admin" />
      <DashboardShell theme="dark" title="Super Admin" sidebar={({ onNavigate }) => <SuperAdminSidebar onNavigate={onNavigate} />}>
        <Outlet />
      </DashboardShell>
    </>
  );
}
