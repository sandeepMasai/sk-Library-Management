import { Outlet } from 'react-router-dom';
import { SuperAdminSidebar } from './SuperAdminSidebar';

export function SuperAdminLayout() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <SuperAdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
          <p className="font-semibold text-slate-900">Super Admin</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
