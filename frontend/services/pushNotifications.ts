import { Platform } from 'react-native';
import { apiPost } from './api';

let registrationStarted = false;

/**
 * Register Expo push token with backend (best-effort; safe in Expo Go).
 */
export async function registerStudentPushTokenIfNeeded(): Promise<void> {
  if (registrationStarted) return;
  registrationStarted = true;

  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      (await import('expo-constants')).default.expoConfig?.extra?.eas?.projectId ??
      (await import('expo-constants')).default.easConfig?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined
    );
    const expoPushToken = tokenResult.data;
    if (!expoPushToken) return;

    await apiPost('/api/student/me/push-token', {
      expoPushToken,
      platform: Platform.OS,
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Library Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch {
    // Push is optional — in-app notifications still work.
  }
}
