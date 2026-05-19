import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh)] bg-slate-100">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
          <p className="font-semibold text-slate-900">Library admin</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
