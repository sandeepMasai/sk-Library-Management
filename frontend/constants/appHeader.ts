import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/** Permanent light-green top header (all app screens). */
export const APP_HEADER_BG = '#D1FAE5';
export const APP_HEADER_FG = '#065F46';

export const appScreenHeaderOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: APP_HEADER_BG },
  headerTitleStyle: { color: APP_HEADER_FG, fontWeight: '700' },
  headerTintColor: APP_HEADER_FG,
  headerShadowVisible: false,
};

export function withAppHeaderOptions(
  extra?: NativeStackNavigationOptions
): NativeStackNavigationOptions {
  return { ...appScreenHeaderOptions, ...extra };
}
