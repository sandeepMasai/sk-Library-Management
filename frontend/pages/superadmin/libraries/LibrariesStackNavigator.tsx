import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SuperAdminHeaderLogo } from '../../../components/superadmin/SuperAdminHeaderLogo';
import AdminLibrariesHubPage from './AdminLibrariesHubPage';
import AdminLibrariesListPage from './AdminLibrariesListPage';
import type { LibrariesStackParamList } from './types';
import { PLAN_FILTER_SCREEN_TITLES } from './types';
import { appScreenHeaderOptions } from '../../../constants/appHeader';

const Stack = createNativeStackNavigator<LibrariesStackParamList>();

export function LibrariesStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        ...appScreenHeaderOptions,
        animation: 'slide_from_right',
        headerRight: () => <SuperAdminHeaderLogo navigation={navigation} size={32} />,
      })}
    >
      <Stack.Screen name="LibrariesHub" component={AdminLibrariesHubPage} options={{ headerShown: false }} />
      <Stack.Screen
        name="LibrariesFiltered"
        component={AdminLibrariesListPage}
        options={({ route }) => ({
          title: PLAN_FILTER_SCREEN_TITLES[route.params.planType] || 'Libraries',
          headerBackTitle: 'Plans',
          headerShown: Platform.OS !== 'web',
        })}
      />
    </Stack.Navigator>
  );
}
