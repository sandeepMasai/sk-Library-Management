export type SettingsSectionId =
  | 'profile'
  | 'students'
  | 'attendance'
  | 'seats'
  | 'notifications'
  | 'billing'
  | 'security'
  | 'appearance'
  | 'advanced';

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  icon: string;
  description: string;
  keywords: string[];
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    id: 'profile',
    label: 'Library Profile',
    icon: '🏢',
    description: 'Logo, contact details, and public library information.',
    keywords: ['profile', 'logo', 'library', 'email', 'phone', 'whatsapp', 'address', 'website', 'map'],
  },
  {
    id: 'students',
    label: 'Student Settings',
    icon: '👨‍🎓',
    description: 'Registration rules and membership requirements.',
    keywords: ['student', 'registration', 'membership', 'id proof', 'photo', 'renewal'],
  },
  {
    id: 'attendance',
    label: 'Attendance Settings',
    icon: '📅',
    description: 'QR attendance, membership rules, and alerts.',
    keywords: ['attendance', 'qr', 'scan', 'absent', 'manual', 'active membership', 'block expired'],
  },
  {
    id: 'seats',
    label: 'Seat Settings',
    icon: '💺',
    description: 'Seat allocation, occupancy display, and numbering.',
    keywords: ['seat', 'allocation', 'occupancy', 'waiting list', 'a1', 'format'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '📩',
    description: 'Student alerts and communication preferences.',
    keywords: ['notification', 'fee', 'expiry', 'holiday', 'announcement', 'push', 'sms', 'whatsapp'],
  },
  {
    id: 'billing',
    label: 'Billing & Subscription',
    icon: '💳',
    description: 'Plan, renewals, invoices, and payment history.',
    keywords: ['billing', 'subscription', 'plan', 'invoice', 'payment', 'renew', 'upgrade', 'premium'],
  },
  {
    id: 'security',
    label: 'Security',
    icon: '🔐',
    description: 'Password, sessions, and login history.',
    keywords: ['security', 'password', 'two factor', '2fa', 'session', 'login', 'logout'],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: '🎨',
    description: 'Theme, density, and sidebar preferences.',
    keywords: ['appearance', 'theme', 'dark', 'light', 'sidebar', 'compact', 'comfortable'],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: '⚡',
    description: 'Export, backup, and danger zone actions.',
    keywords: ['advanced', 'export', 'backup', 'restore', 'delete', 'danger'],
  },
];

export function searchSettingsSections(query: string): SettingsSectionId[] {
  const q = query.trim().toLowerCase();
  if (!q) return SETTINGS_NAV.map((s) => s.id);
  return SETTINGS_NAV.filter(
    (s) =>
      s.label.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.keywords.some((k) => k.includes(q))
  ).map((s) => s.id);
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type NotifyPrefs = {
  feeReminders: boolean;
  expiryAlerts: boolean;
  attendanceAlerts: boolean;
  holidayNotice: boolean;
  announcements: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
};

export const DEFAULT_NOTIFY_PREFS: NotifyPrefs = {
  feeReminders: true,
  expiryAlerts: true,
  attendanceAlerts: true,
  holidayNotice: true,
  announcements: true,
  pushNotifications: true,
  inAppNotifications: true,
};

export type AppearancePrefs = {
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable';
  sidebar: 'expanded' | 'collapsed';
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: 'light',
  density: 'comfortable',
  sidebar: 'expanded',
};

const APPEARANCE_KEY = 'smartlibdesk-settings-appearance';
const NOTIFY_KEY = 'smartlibdesk-settings-notify-preview';

export function loadAppearancePrefs(): AppearancePrefs {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearancePrefs(prefs: AppearancePrefs) {
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(prefs));
}

export function loadNotifyPrefs(): NotifyPrefs {
  try {
    const raw = localStorage.getItem(NOTIFY_KEY);
    if (!raw) return DEFAULT_NOTIFY_PREFS;
    return { ...DEFAULT_NOTIFY_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFY_PREFS;
  }
}

export function saveNotifyPrefs(prefs: NotifyPrefs) {
  localStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
}
