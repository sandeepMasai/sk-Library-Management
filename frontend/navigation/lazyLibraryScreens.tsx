import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

function ScreenFallback() {
  return (
    <View style={fallbackStyles.root}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

function withLazyScreen<P extends object>(load: () => Promise<{ default: React.ComponentType<P> }>) {
  const LazyComponent = lazy(load);
  return function LazyScreen(props: P) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

export const LazyAdminDashboard = withLazyScreen(() => import('../pages/libraryadmin/Dashboard'));
export const LazyAdminStudents = withLazyScreen(() => import('../pages/libraryadmin/Students'));
export const LazyAdminAttendance = withLazyScreen(() => import('../pages/libraryadmin/Attendance'));
export const LazyAdminFees = withLazyScreen(() => import('../pages/libraryadmin/Fees'));

const fallbackStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
