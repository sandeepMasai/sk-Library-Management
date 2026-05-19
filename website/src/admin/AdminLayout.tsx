import { Outlet } from 'react-router-dom';
import { DashboardShell } from '../components/DashboardShell';
import { SeoNoIndex } from '../seo/Seo';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <>
      <SeoNoIndex title="Library admin" />
    <DashboardShell title="Library admin" sidebar={({ onNavigate }) => <AdminSidebar onNavigate={onNavigate} />}>
      <Outlet />
    </DashboardShell>
    </>
  );
}
