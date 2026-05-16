## Super Admin (Admin) Tabs

Super Admin UI is mounted under `AdminRoot` → `AdminTabs()` in `frontend/App.tsx`.

All Super Admin **page components** live in **`frontend/pages/superadmin/`** (exported from [`frontend/pages/superadmin/index.ts`](pages/superadmin/index.ts)).

### Tabs (Bottom navigation)

- **Dashboard**
  - **Route name**: `Dashboard`
  - **Component**: `AdminDashboardPage`
  - **File**: [`frontend/pages/superadmin/AdminDashboardPage.tsx`](pages/superadmin/AdminDashboardPage.tsx)
  - **Backend APIs (common)**:
    - `GET /api/admin/dashboard`
    - `GET /api/admin/libraries`
    - `DELETE /api/admin/libraries/:id`
    - `PATCH /api/admin/libraries/:id/block`

- **Subscriptions**
  - **Route name**: `Subscriptions`
  - **Component**: `AdminSubscriptionsPage`
  - **File**: [`frontend/pages/superadmin/AdminSubscriptionsPage.tsx`](pages/superadmin/AdminSubscriptionsPage.tsx)
  - **Backend APIs (common)**:
    - `GET /api/admin/subscriptions?status=active|expired|cancelled`

- **Plans (Plan Management)**
  - **Route name**: `Plans`
  - **Tab title**: `Plan Management`
  - **Component**: `AdminPlansPage`
  - **File**: [`frontend/pages/superadmin/AdminPlansPage.tsx`](pages/superadmin/AdminPlansPage.tsx)
  - **Backend APIs (common)**:
    - `GET /api/plans?all=1` (admin-only)
    - `POST /api/plans`
    - `PUT /api/plans/:id`
    - `DELETE /api/plans/:id` (system plans like `free`/`trial` are protected)

- **Notify**
  - **Route name**: `Notify`
  - **Component**: `AdminNotifyLibrariesPage`
  - **File**: [`frontend/pages/superadmin/AdminNotifyLibrariesPage.tsx`](pages/superadmin/AdminNotifyLibrariesPage.tsx)
  - **Backend APIs (common)**:
    - `POST /api/admin/notify`
    - (picker list) `GET /api/admin/libraries?page=1&limit=100`

- **Libraries**
  - **Route name**: `Libraries`
  - **Component**: `AdminLibrariesPage`
  - **File**: [`frontend/pages/superadmin/AdminLibrariesPage.tsx`](pages/superadmin/AdminLibrariesPage.tsx)
  - **Backend APIs (common)**:
    - `GET /api/admin/libraries?page=1&limit=10`
    - `PATCH /api/admin/libraries/:id/block`
    - `DELETE /api/admin/libraries/:id` (restricted by “PRO active only” rule)

- **Settings**
  - **Route name**: `Settings`
  - **Component**: `SettingsScreen`
  - **File**: `libDesk/frontend/screens/common/SettingsScreen.tsx`
  - **Related admin screens reachable from Settings**
    - **Global URLs**: `AdminGlobalSettingsPage` → [`frontend/pages/superadmin/AdminGlobalSettingsPage.tsx`](pages/superadmin/AdminGlobalSettingsPage.tsx)
    - **Appearance**: `AppearanceScreen` → `libDesk/frontend/screens/common/AppearanceScreen.tsx`

### Admin “detail” screens (not tabs, opened from tabs)

- **Library Detail**
  - **Route name**: `AdminLibraryDetail`
  - **Component**: `AdminLibraryDetailPage`
  - **File**: [`frontend/pages/superadmin/AdminLibraryDetailPage.tsx`](pages/superadmin/AdminLibraryDetailPage.tsx)

- **Subscription Detail**
  - **Route name**: `AdminSubscriptionDetail`
  - **Component**: `AdminSubscriptionDetailPage`
  - **File**: [`frontend/pages/superadmin/AdminSubscriptionDetailPage.tsx`](pages/superadmin/AdminSubscriptionDetailPage.tsx)

### Notes

- Admin tabs are defined here:
  - [`frontend/App.tsx`](App.tsx) → `function AdminTabs()`
- Library-owner tabs (`LibraryRoot`) use [`frontend/pages/libraryadmin/index.ts`](pages/libraryadmin/index.ts) (e.g. `Dashboard.tsx`). The Super Admin dashboard tab uses `frontend/pages/superadmin/AdminDashboardPage.tsx`.

