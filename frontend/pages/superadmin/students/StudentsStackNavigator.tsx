import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudentsStackParamList } from './types';
import { SuperAdminHeaderLogo } from '../../../components/superadmin/SuperAdminHeaderLogo';
import AdminStudentsLibrariesPage from './AdminStudentsLibrariesPage';
import AdminLibraryStudentsPage from './AdminLibraryStudentsPage';
import AdminStudentDetailModal from './AdminStudentDetailModal';
import { appScreenHeaderOptions } from '../../../constants/appHeader';

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export function StudentsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        ...appScreenHeaderOptions,
        animation: 'slide_from_right',
        headerRight: () => <SuperAdminHeaderLogo navigation={navigation} size={32} />,
      })}
    >
      <Stack.Screen
        name="StudentsLibraryList"
        component={AdminStudentsLibrariesPage}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LibraryStudents"
        component={AdminLibraryStudentsPage}
        options={({ route }) => ({
          title: route.params.libraryName || 'Library students',
          headerBackTitle: 'Students',
          // Web uses SuperAdmin top header; avoid duplicate route/stack headers.
          headerShown: Platform.OS !== 'web',
        })}
      />
      <Stack.Screen
        name="StudentDetail"
        component={AdminStudentDetailModal}
        options={{
          presentation: 'modal',
          title: 'Student details',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
