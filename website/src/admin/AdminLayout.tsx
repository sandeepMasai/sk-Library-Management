import { Outlet } from 'react-router-dom';
import { DashboardShell } from '../components/DashboardShell';
import { SeoNoIndex } from '../seo/Seo';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <>
      <SeoNoIndex title="Library admin" />
    <DashboardShell theme="light" title="Library Admin" sidebar={({ onNavigate }) => <AdminSidebar onNavigate={onNavigate} />}>
      <Outlet />
    </DashboardShell>
    </>
  );
}
