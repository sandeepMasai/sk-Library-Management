import { Alert, Platform, ToastAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

function guessExtension(url: string): string {
  const m = /\.(jpe?g|png|webp)(\?|$)/i.exec(url);
  return m?.[1]?.toLowerCase().replace('jpeg', 'jpg') || 'jpg';
}

function showSavedMessage() {
  const msg = 'Image saved to your gallery.';
  if (Platform.OS === 'android') {
    ToastAndroid.show('Image downloaded', ToastAndroid.SHORT);
  }
  Alert.alert('Downloaded', msg, [{ text: 'OK' }]);
}

/**
 * Download a remote notification image to the device gallery (or share sheet fallback).
 */
export async function downloadNotificationImage(imageUrl: string): Promise<boolean> {
  const url = String(imageUrl || '').trim();
  if (!url) return false;

  try {
    const ext = guessExtension(url);
    const fileUri = `${FileSystem.cacheDirectory}libdesk-notification-${Date.now()}.${ext}`;
    const downloaded = await FileSystem.downloadAsync(url, fileUri);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = downloaded.uri;
        a.download = `notification.${ext}`;
        a.click();
        showSavedMessage();
        return true;
      }
      return false;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      await MediaLibrary.saveToLibraryAsync(downloaded.uri);
      showSavedMessage();
      return true;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
        dialogTitle: 'Save image',
      });
      return true;
    }

    Alert.alert('Permission required', 'Allow photo library access to save images.');
    return false;
  } catch {
    Alert.alert('Download failed', 'Could not save the image. Please try again.');
    return false;
  }
}
