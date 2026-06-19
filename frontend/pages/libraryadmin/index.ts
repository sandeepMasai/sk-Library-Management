/**
 * Library-owner (tenant) operator UI — used under `LibraryRoot` (`LibraryTabs` + shared stack screens).
 * Authentication: library staff JWT (not Super Admin `/api/admin/login`).
 */

export { default as AdminDashboardScreen } from './Dashboard';
export { default as AdminStudents } from './Students';
export { default as AdminStudentForm } from './StudentForm';
export { default as AdminStudentDetail } from './StudentDetail';
export { default as AdminAttendance } from './Attendance';
export { default as AdminNotifications } from './Notifications';
export { default as SendMessageScreen } from './SendMessage';
export { default as CommunicationCenterScreen } from './CommunicationCenter';
export { default as AdminFees } from './Fees';
export { default as RenewalRequestsScreen } from './RenewalRequests';
/** Legacy / optional — not wired in App today; retained for completeness. */
export { default as LibraryAdminSettingsLegacy } from './Settings';
