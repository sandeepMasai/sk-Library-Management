import { CommonActions } from '@react-navigation/native';

const DASHBOARD_ROUTE = 'Dashboard';

/**
 * Jump to Operations Dashboard from any Super Admin nested navigator (drawer / stack).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function navigateToSuperAdminDashboard(navigation: any) {
  let current: any = navigation;

  while (current) {
    const state = current.getState?.();
    const routeNames: string[] = state?.routeNames ?? [];

    if (routeNames.includes(DASHBOARD_ROUTE)) {
      current.dispatch(
        CommonActions.navigate({
          name: DASHBOARD_ROUTE,
          merge: true,
        })
      );
      return;
    }

    const parent: any = current.getParent?.();
    if (!parent || parent === current) break;
    current = parent;
  }

  navigation.dispatch(
    CommonActions.navigate({
      name: 'AdminRoot',
      params: {
        screen: DASHBOARD_ROUTE,
      },
    })
  );
}
