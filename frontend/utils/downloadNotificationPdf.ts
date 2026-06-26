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

async function downloadPdfToCache(pdfUrl: string, title?: string): Promise<string> {
  const url = String(pdfUrl || '').trim();
  if (!url) throw new Error('Missing PDF URL');

  const safeName = String(title || 'document')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 40) || 'document';

  const fileUri = `${FileSystem.cacheDirectory}libdesk-${safeName}-${Date.now()}.pdf`;
  const downloaded = await FileSystem.downloadAsync(url, fileUri);
  return downloaded.uri;
}

/**
 * Open a PDF in the device viewer (download first, then share/open sheet).
 */
export async function openNotificationPdf(pdfUrl: string, title?: string): Promise<boolean> {
  try {
    const localUri = await downloadPdfToCache(pdfUrl, title);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
      return false;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, {
        mimeType: 'application/pdf',
        dialogTitle: title || 'Open PDF',
        UTI: 'com.adobe.pdf',
      });
      return true;
    }

    Alert.alert('PDF ready', 'PDF downloaded. Open it from your files app.');
    return true;
  } catch {
    Alert.alert('Could not open PDF', 'Please try Download PDF or refresh notifications and try again.');
    return false;
  }
}

/**
 * Download a remote notification PDF to the device (share sheet / browser download).
 */
export async function downloadNotificationPdf(pdfUrl: string, title?: string): Promise<boolean> {
  const url = String(pdfUrl || '').trim();
  if (!url) return false;

  try {
    const localUri = await downloadPdfToCache(url, title);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = localUri;
        a.download = `${String(title || 'document').replace(/[^\w\s-]/g, '') || 'document'}.pdf`;
        a.click();
        showSavedMessage();
        return true;
      }
      return false;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, {
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
