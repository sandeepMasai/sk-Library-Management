import React, { useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import SettingsScreen from '../../screens/common/SettingsScreen';
import { useTheme } from '../../theme/ThemeProvider';
import { SuperAdminDrawerContent } from './SuperAdminDrawerContent';
import { SuperAdminTopHeader } from './SuperAdminTopHeader';
import {
  getSuperAdminDrawerTitle,
  type SuperAdminNavKey,
} from './superAdminNavConfig';
import {
  AdminDashboardPage,
  AdminSubscriptionsPage,
  AdminPlansPage,
  AdminNotifyLibrariesPage,
  AdminLibrariesPage,
  AdminStudentsPage,
  AdminPaymentsPage,
} from '../../pages/superadmin';

const Drawer = createDrawerNavigator();

type StudentsNestedParams = { libraryName?: string };

function resolveDrawerTitle(route: {
  name: string;
  state?: { index?: number; routes?: { params?: StudentsNestedParams }[] };
}) {
  const navKey = route.name as SuperAdminNavKey;
  const focused = getFocusedRouteNameFromRoute(route as never);
  const nestedRoute = route.state?.routes?.[route.state.index ?? 0];
  const nestedParams = nestedRoute?.params;
  return getSuperAdminDrawerTitle(navKey, focused, nestedParams);
}

/**
 * Super Admin shell — drawer sidebar + primary screens (replacing bottom tabs).
 */
export function SuperAdminDrawerNavigator() {
  const { mode } = useTheme();
  const { width } = useWindowDimensions();
  const [railCollapsed, setRailCollapsed] = useState(false);

  const permanentDrawer = Platform.OS === 'web' && width >= 1024;
  const drawerWidthBase = permanentDrawer ? (railCollapsed ? 84 : 288) : 288;
  const defaultDrawerOpen = permanentDrawer || (Platform.OS !== 'web' && width >= 900);
  const shouldCloseDrawer = !permanentDrawer;

  const renderDrawer = (props: DrawerContentComponentProps) => (
    <SuperAdminDrawerContent
      {...props}
      railCollapsed={railCollapsed}
      onToggleRail={() => setRailCollapsed((c) => !c)}
      notificationCount={0}
      shouldCloseDrawer={shouldCloseDrawer}
    />
  );

  return (
    <Drawer.Navigator
      drawerContent={renderDrawer}
      screenOptions={({ route }) => ({
        drawerType: (permanentDrawer ? 'permanent' : 'front') as 'permanent' | 'front',
        drawerStyle: {
          width: drawerWidthBase,
          borderRightWidth: 0,
          backgroundColor: 'transparent',
        },
        overlayColor: mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.35)',
        headerShown: true,
        sceneContainerStyle: { flex: 1, overflow: 'hidden' as const },
        swipeEnabled: !permanentDrawer,
        title: resolveDrawerTitle(route),
        headerShadowVisible: false,
        header: (props) => (
          <SuperAdminTopHeader {...props} showDrawerToggle={!permanentDrawer} />
        ),
      })}
      initialRouteName="Dashboard"
      defaultStatus={defaultDrawerOpen ? 'open' : 'closed'}
      backBehavior="history"
    >
      <Drawer.Screen name="Dashboard" component={AdminDashboardPage} />
      <Drawer.Screen name="Libraries" component={AdminLibrariesPage} />
      <Drawer.Screen name="Subscriptions" component={AdminSubscriptionsPage} />
      <Drawer.Screen name="Students" component={AdminStudentsPage} />
      <Drawer.Screen name="Plans" component={AdminPlansPage} />
      <Drawer.Screen name="Payments" component={AdminPaymentsPage} />
      <Drawer.Screen name="Notifications" component={AdminNotifyLibrariesPage} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
