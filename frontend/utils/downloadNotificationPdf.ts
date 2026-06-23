import { Alert, Platform, ToastAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function showSavedMessage() {
  const msg = 'PDF saved to your device.';
  if (Platform.OS === 'android') {
    ToastAndroid.show('PDF downloaded', ToastAndroid.SHORT);
  }
  Alert.alert('Downloaded', msg, [{ text: 'OK' }]);
}

/**
 * Download a remote notification PDF to the device (share sheet / browser download).
 */
export async function downloadNotificationPdf(pdfUrl: string, title?: string): Promise<boolean> {
  const url = String(pdfUrl || '').trim();
  if (!url) return false;

  const safeName = String(title || 'document')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 40) || 'document';

  try {
    const fileUri = `${FileSystem.cacheDirectory}libdesk-${safeName}-${Date.now()}.pdf`;
    const downloaded = await FileSystem.downloadAsync(url, fileUri);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = downloaded.uri;
        a.download = `${safeName}.pdf`;
        a.click();
        showSavedMessage();
        return true;
      }
      return false;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save PDF',
        UTI: 'com.adobe.pdf',
      });
      return true;
    }

    Alert.alert('Download ready', 'PDF downloaded. Open it from your files app.');
    return true;
  } catch {
    Alert.alert('Download failed', 'Could not save the PDF. Please try again.');
    return false;
  }
}
