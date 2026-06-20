import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from './admin/AdminLayout';
import { AdminAttendance } from './admin/pages/AdminAttendance';
import { AdminDashboard } from './admin/pages/AdminDashboard';
import { AdminSeats } from './admin/pages/AdminSeats';
import { AdminSettings } from './admin/pages/AdminSettings';
import { AdminStudents } from './admin/pages/AdminStudents';
import { AdminSubscription } from './admin/pages/AdminSubscription';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Services } from './pages/Services';
import { Pricing } from './pages/Pricing';
import { Contact } from './pages/Contact';
import { DownloadApp } from './pages/DownloadApp';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Terms } from './pages/Terms';
import { RefundPolicy } from './pages/RefundPolicy';
import { NotFound } from './pages/NotFound';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { SuperAdminLayout } from './superadmin/SuperAdminLayout';
import { SuperAdminDashboard } from './superadmin/pages/SuperAdminDashboard';
import { SuperAdminLibraries } from './superadmin/pages/SuperAdminLibraries';
import { SuperAdminLibraryDetail } from './superadmin/pages/SuperAdminLibraryDetail';
import { SuperAdminPlans } from './superadmin/pages/SuperAdminPlans';
import { SuperAdminSubscriptions } from './superadmin/pages/SuperAdminSubscriptions';
import { SuperAdminStudents } from './superadmin/pages/SuperAdminStudents';
import { SuperAdminNotifications } from './superadmin/pages/SuperAdminNotifications';
import { SUPER_ADMIN_LOGIN_PATH } from './lib/routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'services', element: <Services /> },
      { path: 'courses', element: <Services /> },
      { path: 'pricing', element: <Pricing /> },
      { path: 'contact', element: <Contact /> },
      { path: 'download', element: <DownloadApp /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      { path: 'privacy-policy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <Terms /> },
      { path: 'refund-policy', element: <RefundPolicy /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute roles={['library']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'students', element: <AdminStudents /> },
      { path: 'attendance', element: <AdminAttendance /> },
      { path: 'seats', element: <AdminSeats /> },
      { path: 'subscription', element: <AdminSubscription /> },
      { path: 'settings', element: <AdminSettings /> },
    ],
  },
  { path: '/admin/*', element: <Navigate to="/admin" replace /> },
  { path: SUPER_ADMIN_LOGIN_PATH, element: <SuperAdminLogin /> },
  { path: '/superadmin/login', element: <Navigate to="/" replace /> },
  {
    path: '/superadmin',
    element: (
      <ProtectedRoute roles={['admin']}>
        <SuperAdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/superadmin/dashboard" replace /> },
      { path: 'dashboard', element: <SuperAdminDashboard /> },
      { path: 'libraries', element: <SuperAdminLibraries /> },
      { path: 'libraries/:id', element: <SuperAdminLibraryDetail /> },
      { path: 'plans', element: <SuperAdminPlans /> },
      { path: 'subscriptions', element: <SuperAdminSubscriptions /> },
      { path: 'students', element: <SuperAdminStudents /> },
      { path: 'notifications', element: <SuperAdminNotifications /> },
    ],
  },
]);
