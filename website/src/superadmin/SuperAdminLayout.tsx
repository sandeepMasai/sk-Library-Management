import { Outlet } from 'react-router-dom';
import { DashboardShell } from '../components/DashboardShell';
import { SuperAdminSidebar } from './SuperAdminSidebar';

export function SuperAdminLayout() {
  return (
    <DashboardShell title="Super Admin" sidebar={({ onNavigate }) => <SuperAdminSidebar onNavigate={onNavigate} />}>
      <Outlet />
    </DashboardShell>
  );
}
