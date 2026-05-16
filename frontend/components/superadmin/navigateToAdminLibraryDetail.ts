import { CommonActions } from '@react-navigation/native';

const LIBRARY_DETAIL_ROUTE = 'AdminLibraryDetail';

/** Open library detail from any Super Admin nested screen. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function navigateToAdminLibraryDetail(navigation: any, libraryId: string) {
  if (!libraryId) return;

  let current: any = navigation;
  while (current) {
    const state = current.getState?.();
    const routeNames: string[] = state?.routeNames ?? [];
    if (routeNames.includes(LIBRARY_DETAIL_ROUTE)) {
      current.navigate(LIBRARY_DETAIL_ROUTE, { libraryId });
      return;
    }
    const parent: any = current.getParent?.();
    if (!parent || parent === current) break;
    current = parent;
  }

  navigation.dispatch(
    CommonActions.navigate({
      name: LIBRARY_DETAIL_ROUTE,
      params: { libraryId },
    })
  );
}
