/**
 * React Navigation + Expo deep linking for SmartLibDesk.
 *
 * Does not import `expo-linking` (avoids native TurboModule "ExpoLinking" errors in Expo Go /
 * web / until a dev-client rebuild). Uses `expo-constants` for an optional dev `linkingUri`
 * prefix when the host provides it.
 *
 * Expo Go may still use `exp+libdesk://` (slug) — kept for backwards compatibility.
 */
import Constants from 'expo-constants';

/** Primary app scheme (must match `app.json` → `expo.scheme`). */
export const APP_LINK_SCHEME = 'smartlibdesk';

function dedupePrefixes(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    const s = String(p || '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * Optional Expo dev / Go base URL (e.g. exp://192.168.x.x:8081) when injected by the runtime.
 */
function getConstantsLinkingUriPrefix(): string {
  const raw = (Constants as { linkingUri?: string }).linkingUri;
  if (typeof raw !== 'string' || !raw.trim()) return '';
  let u = raw.trim();
  if (!u.endsWith('/')) u = `${u}/`;
  return u;
}

/**
 * URL prefixes React Navigation listens to (web + native custom schemes).
 */
export function getNavigationLinkingPrefixes(): string[] {
  return dedupePrefixes([
    getConstantsLinkingUriPrefix(),
    `${APP_LINK_SCHEME}://`,
    'libdesk://',
    'exp+libdesk://',
    '/',
  ]);
}

export const rootLinking = {
  prefixes: getNavigationLinkingPrefixes(),
  config: {
    screens: {
      Login: '',
      ForgotPassword: 'forgot-password',
      ForgotPasswordOtp: 'forgot-password/otp',
      ResetPassword: 'forgot-password/new-password',
      AdminLogin: 'admin/login',
      RegisterLibrary: 'register-library',
      AdminRoot: {
        path: 'superadmin',
        screens: {
          Dashboard: 'dashboard',
          Libraries: {
            path: 'libraries',
            screens: {
              LibrariesHub: '',
              LibrariesFiltered: ':planType',
            },
          },
          Subscriptions: 'subscriptions',
          Students: {
            path: 'students',
            screens: {
              StudentsLibraryList: '',
              LibraryStudents: ':libraryId',
            },
          },
          Plans: 'plans',
          Payments: 'payments',
          Notifications: 'notifications',
          Settings: 'settings',
        },
      },
      LibraryRoot: {
        screens: {
          Dashboard: 'dashboard',
          Students: 'students',
          Attendance: 'attendance',
          Payments: 'payments',
          Seats: 'seats',
        },
      },
      StudentRoot: {
        path: 'student',
        screens: {
          Dashboard: 'dashboard',
          Attendance: 'attendance',
        },
      },
    },
  },
};
