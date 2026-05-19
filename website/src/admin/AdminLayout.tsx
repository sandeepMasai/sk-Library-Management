import { Outlet } from 'react-router-dom';
import { DashboardShell } from '../components/DashboardShell';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <DashboardShell title="Library admin" sidebar={({ onNavigate }) => <AdminSidebar onNavigate={onNavigate} />}>
      <Outlet />
    </DashboardShell>
  );
}
