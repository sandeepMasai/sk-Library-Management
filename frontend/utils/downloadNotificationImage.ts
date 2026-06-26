import { Alert, Platform, ToastAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

function guessExtension(url: string): string {
  const clean = String(url || '').split('?')[0];
  const m = /\.(jpe?g|png|webp|gif)(\?|$)/i.exec(clean);
  return m?.[1]?.toLowerCase().replace('jpeg', 'jpg') || 'jpg';
}

function mimeForExtension(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function showSavedMessage() {
  const msg = 'Image saved to your gallery.';
  if (Platform.OS === 'android') {
    ToastAndroid.show('Image saved', ToastAndroid.SHORT);
  }
  Alert.alert('Saved', msg, [{ text: 'OK' }]);
}

async function downloadImageToCache(imageUrl: string): Promise<{ uri: string; ext: string }> {
  const url = String(imageUrl || '').trim();
  if (!url) throw new Error('Missing image URL');

  const ext = guessExtension(url);
  const fileUri = `${FileSystem.cacheDirectory}libdesk-notification-${Date.now()}.${ext}`;
  const downloaded = await FileSystem.downloadAsync(url, fileUri);

  if (!downloaded?.uri) {
    throw new Error('Download returned no file');
  }
  if (downloaded.status && downloaded.status !== 200) {
    throw new Error(`Download failed (HTTP ${downloaded.status})`);
  }

  return { uri: downloaded.uri, ext };
}

/**
 * Download / save a remote notification image (share sheet first — works without gallery permission).
 */
export async function downloadNotificationImage(imageUrl: string): Promise<boolean> {
  const url = String(imageUrl || '').trim();
  if (!url) return false;

  try {
    const { uri, ext } = await downloadImageToCache(url);
    const mimeType = mimeForExtension(ext);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = uri;
        a.download = `notification.${ext}`;
        a.click();
        showSavedMessage();
        return true;
      }
      return false;
    }

    // Prefer share sheet — reliable on Android without storage permission issues.
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType,
        dialogTitle: 'Save image',
        UTI: ext === 'png' ? 'public.png' : 'public.jpeg',
      });
      return true;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status === 'granted' || status === 'limited') {
      await MediaLibrary.saveToLibraryAsync(uri);
      showSavedMessage();
      return true;
    }

    Alert.alert('Permission required', 'Allow photo library access to save images.');
    return false;
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    Alert.alert(
      'Download failed',
      detail
        ? `Could not save the image (${detail}). Please try again.`
        : 'Could not save the image. Please try again.'
    );
    return false;
  }
}

/**
 * Open image via share sheet (save to gallery / open in viewer app).
 */
export async function openNotificationImage(imageUrl: string, title?: string): Promise<boolean> {
  try {
    const { uri, ext } = await downloadImageToCache(imageUrl);
    const mimeType = mimeForExtension(ext);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(imageUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
      return false;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType,
        dialogTitle: title || 'Open image',
        UTI: ext === 'png' ? 'public.png' : 'public.jpeg',
      });
      return true;
    }

    return downloadNotificationImage(imageUrl);
  } catch {
    Alert.alert('Could not open image', 'Please try again or check your connection.');
    return false;
  }
}
