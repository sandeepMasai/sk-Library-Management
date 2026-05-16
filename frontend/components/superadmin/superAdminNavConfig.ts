/**
 * Super Admin sidebar — single source of truth for menu items.
 *
 * - React Navigation: `navigation.navigate(item.navKey)`.
 * - Web / Next.js / React Router: use `pathSegment` → `${SUPERADMIN_BASE_PATH}/${pathSegment}`
 *   e.g. Payments → `/superadmin/payments`
 */
export const SUPERADMIN_BASE_PATH = '/superadmin';

export type SuperAdminNavKey =
  | 'Dashboard'
  | 'Libraries'
  | 'Subscriptions'
  | 'Students'
  | 'Plans'
  | 'Payments'
  | 'Notifications'
  | 'Settings';

export type SuperAdminNavIconName =
  | 'LayoutDashboard'
  | 'LibraryBig'
  | 'CreditCard'
  | 'GraduationCap'
  | 'Tags'
  | 'Wallet'
  | 'Bell'
  | 'Settings2';

export type SuperAdminNavItem = {
  navKey: SuperAdminNavKey;
  /** User-facing label */
  label: string;
  /** URL segment under SUPERADMIN_BASE_PATH (no leading slash) */
  pathSegment: string;
  icon: SuperAdminNavIconName;
  /** Optional notification dot / count (0 hides badge) */
  badge?: 'dot' | 'count';
};

export const SUPERADMIN_NAV_ITEMS: SuperAdminNavItem[] = [
  { navKey: 'Dashboard', label: 'Operations Dashboard', pathSegment: 'dashboard', icon: 'LayoutDashboard' },
  { navKey: 'Libraries', label: 'Libraries', pathSegment: 'libraries', icon: 'LibraryBig' },
  { navKey: 'Subscriptions', label: 'Subscriptions', pathSegment: 'subscriptions', icon: 'CreditCard' },
  { navKey: 'Students', label: 'Students', pathSegment: 'students', icon: 'GraduationCap' },
  { navKey: 'Plans', label: 'Plans', pathSegment: 'plans', icon: 'Tags' },
  { navKey: 'Payments', label: 'Payment Details', pathSegment: 'payments', icon: 'Wallet', badge: 'dot' },
  { navKey: 'Notifications', label: 'Notifications', pathSegment: 'notifications', icon: 'Bell', badge: 'count' },
  { navKey: 'Settings', label: 'Settings', pathSegment: 'settings', icon: 'Settings2' },
];

export function superAdminHref(pathSegment: string): string {
  const s = String(pathSegment || '').replace(/^\/+/, '');
  return `${SUPERADMIN_BASE_PATH}/${s}`.replace(/\/+/g, '/');
}

export function hrefForNavItem(item: SuperAdminNavItem): string {
  return superAdminHref(item.pathSegment);
}

/** Drawer / top header titles — never show raw route keys in the UI. */
export const SUPERADMIN_SCREEN_TITLES: Record<SuperAdminNavKey, string> = {
  Dashboard: 'Operations Dashboard',
  Libraries: 'Libraries',
  Subscriptions: 'Subscriptions',
  Students: 'Students',
  Plans: 'Plan Management',
  Payments: 'Payment Details',
  Notifications: 'Notifications',
  Settings: 'Settings',
};

export function getSuperAdminDrawerTitle(
  navKey: SuperAdminNavKey,
  nestedRouteName?: string | null,
  nestedParams?: { libraryName?: string } | null
): string {
  if (navKey === 'Students') {
    if (nestedRouteName === 'LibraryStudents') {
      return nestedParams?.libraryName?.trim() || 'Library students';
    }
    if (nestedRouteName === 'StudentDetail') {
      return 'Student details';
    }
    return SUPERADMIN_SCREEN_TITLES.Students;
  }
  if (navKey === 'Libraries' && nestedRouteName === 'LibrariesFiltered') {
    return 'Libraries';
  }
  return SUPERADMIN_SCREEN_TITLES[navKey] ?? navKey;
}

/** Dashboard insight shortcuts (scroll targets on Operations Dashboard). */
export type SuperAdminInsightKey = 'new-libraries' | 'recent-activity' | 'revenue-overview';

export type SuperAdminInsightItem = {
  insightKey: SuperAdminInsightKey;
  label: string;
  icon: 'Building2' | 'Activity' | 'IndianRupee';
};

export const SUPERADMIN_INSIGHT_ITEMS: SuperAdminInsightItem[] = [
  { insightKey: 'new-libraries', label: 'New Libraries', icon: 'Building2' },
  { insightKey: 'recent-activity', label: 'Recent Activity', icon: 'Activity' },
  { insightKey: 'revenue-overview', label: 'Payment revenue', icon: 'IndianRupee' },
];
