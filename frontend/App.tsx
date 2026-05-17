import React from 'react';
import { BackHandler, Platform, StatusBar as RNStatusBar, ToastAndroid, TouchableOpacity } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppStore } from './store';
import { libraryMustChoosePlan } from './utils/libraryAccess';
import { isNotificationUnread } from './utils/notificationRead';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import FloatingTabBar from './components/navigation/FloatingTabBar';
import { AdminRoute, LibraryRoute, StudentRoute } from './components/routing/ProtectedRoutes';
import { ConfirmModal } from './components/ConfirmModal';
// Screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterLibraryScreen from './screens/auth/RegisterLibraryScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import ForgotPasswordOtpScreen from './screens/auth/ForgotPasswordOtpScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import AdminLoginScreen from './screens/auth/AdminLoginScreen';
import {
  AdminDashboardScreen,
  AdminStudents,
  AdminStudentForm,
  AdminStudentDetail,
  AdminAttendance,
  AdminNotifications,
  AdminFees,
} from './pages/libraryadmin';
import {
  AdminLibraryDetailPage,
  AdminSubscriptionDetailPage,
  AdminPlansPage,
  AdminGlobalSettingsPage,
} from './pages/superadmin';
import SettingsScreen from './screens/common/SettingsScreen';
import AppearanceScreen from './screens/common/AppearanceScreen';
import StudentHome from './screens/student/Home';
import StudentScanQR from './screens/student/ScanQR';
import StudentNotifications from './screens/student/Notifications';
import StudentCalendarScreen from './screens/student/CalendarScreen';
import StudentProfile from './screens/student/Profile';
import StudentSettingsScreen from './screens/student/Settings';
import StudentPrivacyPolicyScreen from './screens/student/PrivacyPolicy';
import StudentTermsConditionsScreen from './screens/student/TermsConditions';
import StudentLegalWebViewScreen from './screens/student/LegalWebView';
import LibrarySeatsScreen from './screens/library/Seats';
import SubscriptionScreen from './screens/library/Subscription';
import PlanSelectionScreen from './screens/library/PlanSelectionScreen';
import BillingHistoryScreen from './screens/library/BillingHistoryScreen';
import PaymentSuccessScreen from './screens/library/PaymentSuccessScreen';
import PaymentErrorScreen from './screens/library/PaymentErrorScreen';
import LibraryProfileScreen from './screens/library/Profile';
import MessageTemplatesScreen from './screens/library/MessageTemplates';
import EditTemplateScreen from './screens/library/EditTemplate';
import CreateTemplateScreen from './screens/library/CreateTemplate';
import LibraryBrandingScreen from './screens/library/LibraryBranding';
import LibraryChangePasswordScreen from './screens/library/ChangePassword';
import PlaceholderScreen from './screens/common/PlaceholderScreen';
import SplashScreen from './screens/common/SplashScreen';
import { SuperAdminDrawerNavigator } from './components/superadmin/SuperAdminDrawerNavigator';
import { rootLinking } from './navigation/linking';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

/** Super Admin — SaaS drawer sidebar (web + native); see `SuperAdminDrawerNavigator`. */
function AdminTabs() {
  return <SuperAdminDrawerNavigator />;
}

function StudentTabs() {
  const unread = useAppStore((s) => {
    const user = s.currentUser;
    if (!user) return 0;
    return s.notifications.filter((n) => isNotificationUnread(n, user.id, s.lastNotifSeenAt)).length;
  });

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Scan Attendance') iconName = focused ? 'qr-code' : 'qr-code-outline';
          else if (route.name === 'Calendar') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={StudentHome}
        options={({ navigation }) => ({
          tabBarLabel: 'Home',
          title: 'Student Home',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => (navigation.getParent() as any)?.navigate('StudentProfile')}
              style={{ marginRight: 4, padding: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen name="Scan Attendance" component={StudentScanQR} options={{ tabBarLabel: 'Scan', title: 'Scan Attendance' }} />
      <Tab.Screen name="Calendar" component={StudentCalendarScreen} options={{ tabBarLabel: 'Calendar', title: 'Attendance History' }} />
      <Tab.Screen
        name="Notifications"
        component={StudentNotifications}
        options={{
          tabBarLabel: 'Notifications',
          title: 'Notifications',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger, color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
        }}
      />
      <Tab.Screen name="Settings" component={StudentSettingsScreen} options={{ tabBarLabel: 'Settings', title: 'Settings' }} />
    </Tab.Navigator>
  );
}

function StudentMainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs" component={StudentTabs} />
      <Stack.Screen
        name="StudentProfile"
        component={StudentProfile}
        options={{
          headerShown: true,
          title: 'Profile',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="StudentPrivacyPolicy"
        component={StudentPrivacyPolicyScreen}
        options={{
          headerShown: true,
          title: 'Privacy Policy',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="StudentTermsConditions"
        component={StudentTermsConditionsScreen}
        options={{
          headerShown: true,
          title: 'Terms & Conditions',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="StudentLegalWebView"
        component={StudentLegalWebViewScreen}
        options={({ route }: any) => ({
          headerShown: true,
          title: String(route?.params?.title || 'Document'),
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        })}
      />
      <Stack.Screen
        name="Appearance"
        component={AppearanceScreen}
        options={{
          headerShown: true,
          title: 'Appearance',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

function librarySubscriptionTabBlocker({ navigation }: { navigation: { getParent: () => unknown } }) {
  return {
    tabPress: (e: { preventDefault: () => void }) => {
      const user = useAppStore.getState().currentUser;
      if (libraryMustChoosePlan(user)) {
        e.preventDefault();
        const parent = navigation.getParent() as { navigate: (name: string) => void } | undefined;
        parent?.navigate('Subscription');
      }
    },
  };
}

function LibraryTabs() {
  // Reuse the same UI screens, but expose URL paths as requested.
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Students') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Attendance') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Payments') iconName = focused ? 'cash' : 'cash-outline';
          else if (route.name === 'Seats') iconName = focused ? 'apps' : 'apps-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      })}
    >
      {/* Library dashboard — blocked until paid subscription */}
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} listeners={librarySubscriptionTabBlocker} />
      <Tab.Screen name="Students" component={AdminStudents} listeners={librarySubscriptionTabBlocker} />
      <Tab.Screen name="Attendance" component={AdminAttendance} listeners={librarySubscriptionTabBlocker} />
      <Tab.Screen name="Payments" component={AdminFees} listeners={librarySubscriptionTabBlocker} />
      <Tab.Screen name="Seats" component={LibrarySeatsScreen} listeners={librarySubscriptionTabBlocker} />
      <Tab.Screen name="Settings" component={SettingsScreen} listeners={librarySubscriptionTabBlocker} />
    </Tab.Navigator>
  );
}

function LibraryMainStack() {
  const currentUser = useAppStore((s) => s.currentUser);
  const gate = libraryMustChoosePlan(currentUser);
  const initialRouteName = gate ? 'Subscription' : 'LibraryTabs';

  return (
    // Key forces remount when gate flips (avoids unsupported RESET dispatch).
    <Stack.Navigator key={gate ? 'gate_on' : 'gate_off'} initialRouteName={initialRouteName}>
      <Stack.Screen name="LibraryTabs" component={LibraryTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={AdminNotifications} options={{ headerShown: false }} />
      <Stack.Screen name="PlanSelection" component={PlanSelectionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PaymentError" component={PaymentErrorScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Subscription', headerStyle: { backgroundColor: theme.colors.surface }, headerShadowVisible: false }}
      />
      <Stack.Screen
        name="Billing"
        component={BillingHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={LibraryProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="LibraryChangePassword" component={LibraryChangePasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Branch"
        options={{ title: 'Branch', headerStyle: { backgroundColor: theme.colors.surface }, headerShadowVisible: false }}
      >
        {() => <PlaceholderScreen title="Branch Switcher" subtitle="Coming soon" />}
      </Stack.Screen>
      <Stack.Screen name="MessageTemplates" component={MessageTemplatesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditTemplate" component={EditTemplateScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTemplate" component={CreateTemplateScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LibraryBranding" component={LibraryBrandingScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ShiftManagement"
        component={LibrarySeatsScreen}
        options={{
          title: 'Shift management',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '700', color: theme.colors.text },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

function AdminRoot() {
  return (
    <AdminRoute>
      <AdminTabs />
    </AdminRoute>
  );
}

function LibraryRoot() {
  return (
    <LibraryRoute>
      <LibraryMainStack />
    </LibraryRoute>
  );
}

function StudentRoot() {
  return (
    <StudentRoute>
      <StudentMainStack />
    </StudentRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const currentUser = useAppStore((state) => state.currentUser);
  const backPressRef = React.useRef(0);
  const { mode, hydrated, theme: uiTheme } = useTheme();
  const barStyle = mode === 'dark' ? 'light-content' : 'dark-content';
  const [showExitModal, setShowExitModal] = React.useState(false);

  React.useEffect(() => {
    if (!currentUser) return;

    const studentRootTabs = ['Home', 'Scan Attendance', 'Calendar', 'Notifications'];
    const adminLeafScreens = [
      'Libraries',
      'Subscriptions',
      'Students',
      'Plans',
      'Payments',
      'Notifications',
      'Settings',
    ];

    const handleBackPress = () => {
      if (!navigationRef.isReady()) return false;

      const route = navigationRef.getCurrentRoute() as { name?: string } | undefined;
      const routeName = route?.name ?? '';

      if (currentUser.role === 'student') {
        if (routeName && routeName !== 'Home' && studentRootTabs.includes(routeName)) {
          // Student main stack is mounted under `StudentRoot` (not `StudentMain`).
          // This keeps Android back behavior working without navigating to a missing route.
          (navigationRef as any).navigate('StudentRoot', {
            screen: 'StudentTabs',
            params: { screen: 'Home' },
          });
          return true;
        }
        if (routeName === 'Home') {
          const now = Date.now();
          if (backPressRef.current && now - backPressRef.current < 1800) {
            BackHandler.exitApp();
            return true;
          }
          backPressRef.current = now;
          if (Platform.OS === 'android') {
            ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          } else {
            setShowExitModal(true);
          }
          return true;
        }
      }

      if (currentUser.role === 'admin') {
        if (routeName && routeName !== 'Dashboard' && adminLeafScreens.includes(routeName)) {
          (navigationRef as any).navigate('AdminRoot', { screen: 'Dashboard' });
          return true;
        }
        if (routeName === 'Dashboard') {
          const now = Date.now();
          if (backPressRef.current && now - backPressRef.current < 1800) {
            BackHandler.exitApp();
            return true;
          }
          backPressRef.current = now;
          if (Platform.OS === 'android') {
            ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          } else {
            setShowExitModal(true);
          }
          return true;
        }
      }

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [currentUser]);

  if (!hydrated) return null;

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={rootLinking as any}
      theme={{
        dark: mode === 'dark',
        colors: {
          primary: uiTheme.colors.primary,
          background: uiTheme.colors.background,
          card: uiTheme.colors.surface,
          text: uiTheme.colors.text,
          border: uiTheme.colors.border,
          notification: '#EF4444',
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <RNStatusBar
        hidden={false}
        translucent={false}
        barStyle={barStyle}
        backgroundColor={Platform.OS === 'android' ? uiTheme.colors.background : undefined}
      />
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        {/* Boot / session check */}
        <Stack.Screen name="Splash" component={SplashScreen} />

        {/* Public */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="RegisterLibrary" component={RegisterLibraryScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ForgotPasswordOtp" component={ForgotPasswordOtpScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        {/* Protected role roots */}
        <Stack.Screen name="AdminRoot" component={AdminRoot} />
        <Stack.Screen name="LibraryRoot" component={LibraryRoot} />
        <Stack.Screen name="StudentRoot" component={StudentRoot} />

        {/* Shared screens (kept for backwards compatible navigation flows) */}
        <Stack.Screen
          name="AdminStudentDetail"
          component={AdminStudentDetail}
          options={{
            headerShown: true,
            title: 'Student',
            headerStyle: { backgroundColor: uiTheme.colors.surface },
            headerTintColor: uiTheme.colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="AdminStudentForm"
          component={AdminStudentForm}
          options={{
            headerShown: true,
            title: 'Student details',
            headerStyle: { backgroundColor: uiTheme.colors.surface },
            headerTintColor: uiTheme.colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="AdminFees"
          component={AdminFees}
          options={{
            headerShown: true,
            title: 'Fee Management',
            headerStyle: { backgroundColor: uiTheme.colors.surface },
            headerTintColor: uiTheme.colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="AdminLibraryDetail"
          component={AdminLibraryDetailPage}
          options={{
            headerShown: true,
            title: 'Library Detail',
            headerStyle: { backgroundColor: uiTheme.colors.surface },
            headerTintColor: uiTheme.colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="AdminSubscriptionDetail"
          component={AdminSubscriptionDetailPage}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AdminPlans"
          component={AdminPlansPage}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AdminGlobalSettings"
          component={AdminGlobalSettingsPage}
          options={{
            headerShown: true,
            title: 'Global URLs',
            headerStyle: { backgroundColor: uiTheme.colors.surface },
            headerTintColor: uiTheme.colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="Appearance"
          component={AppearanceScreen}
          options={{
            headerShown: true,
            title: 'Appearance',
            headerStyle: { backgroundColor: uiTheme.colors.surface },
            headerTintColor: uiTheme.colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
      </Stack.Navigator>

      <ConfirmModal
        visible={showExitModal}
        tone="neutral"
        label="EXIT"
        title="Exit"
        description="Press back again to exit"
        showCancel={false}
        confirmText="OK"
        confirmIcon="checkmark-outline"
        onCancel={() => setShowExitModal(false)}
        onConfirm={() => setShowExitModal(false)}
      />
    </NavigationContainer>
  );
}
