## Library-owner admin (tenant) UI

These screens belong to **`LibraryRoot`** (library staff JWT), **not** Super Admin (`AdminRoot`). They live in **`frontend/pages/libraryadmin/`** and are exported from **[`frontend/pages/libraryadmin/index.ts`](pages/libraryadmin/index.ts)**.

### Where they are wired

- **Tabs** — [`frontend/App.tsx`](App.tsx) → `function LibraryTabs()` (`Dashboard`, `Students`, `Attendance`, `Payments`, `Seats`, `Settings`).
- **Shared stack routes** — `AdminStudentDetail`, `AdminStudentForm`, `AdminFees`, `Notifications` (same [`App.tsx`](App.tsx)).

### Modules (sources)

| File | Role |
|------|------|
| [`pages/libraryadmin/Dashboard.tsx`](pages/libraryadmin/Dashboard.tsx) | Library dashboard |
| [`pages/libraryadmin/Students.tsx`](pages/libraryadmin/Students.tsx) | Student list |
| [`pages/libraryadmin/StudentForm.tsx`](pages/libraryadmin/StudentForm.tsx) | Add / edit student |
| [`pages/libraryadmin/StudentDetail.tsx`](pages/libraryadmin/StudentDetail.tsx) | Student detail |
| [`pages/libraryadmin/Attendance.tsx`](pages/libraryadmin/Attendance.tsx) | Attendance + QR helpers |
| [`pages/libraryadmin/Fees.tsx`](pages/libraryadmin/Fees.tsx) | Payments / fees (“Payments” tab) |
| [`pages/libraryadmin/Notifications.tsx`](pages/libraryadmin/Notifications.tsx) | In-app notifications list |
| [`pages/libraryadmin/Settings.tsx`](pages/libraryadmin/Settings.tsx) | Legacy settings UI (exported as `LibraryAdminSettingsLegacy`; not mounted in navigator today) |

### Thin wrappers (`pages/*.tsx`)

Some routes use loaders in **`frontend/pages/`** that delegate to these screens (same pattern as before; imports now resolve via `./libraryadmin`): `DashboardPage`, `StudentsPage`, `AttendancePage`, `NotificationsPage`, `AddStudentPage`.

### Contrast with Super Admin

See [`frontend/README-ADMIN.md`](README-ADMIN.md) for **`frontend/pages/superadmin/`** (platform operator).
