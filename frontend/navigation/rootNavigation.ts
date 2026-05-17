import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { AuthRole } from '../store';

export const navigationRef = createNavigationContainerRef();

export type AuthRootRoute = 'Login' | 'LibraryRoot' | 'StudentRoot' | 'AdminRoot';

export function resetAuthNavigation(route: AuthRootRoute) {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: route }],
    })
  );
}

export function resetAfterAuth(role: AuthRole | null | undefined) {
  const r = String(role || '').trim().toLowerCase();
  if (r === 'library') resetAuthNavigation('LibraryRoot');
  else if (r === 'student') resetAuthNavigation('StudentRoot');
  else if (r === 'admin') resetAuthNavigation('AdminRoot');
  else resetAuthNavigation('Login');
}
