import { Alert, Platform, ToastAndroid } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PaymentRow } from './types';

function showDownloadSuccess(libraryName: string) {
  const message = `Invoice for "${libraryName}" downloaded successfully.`;
  if (Platform.OS === 'android') {
    ToastAndroid.show('Download successful', ToastAndroid.SHORT);
  }
  Alert.alert('Download successful', message, [{ text: 'OK' }]);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN');
  } catch {
    return '—';
  }
}

function invoiceHtml(row: PaymentRow) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Invoice ${row.transactionId}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; color: #0f172a; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #64748b; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
  td { padding: 10px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  td:first-child { color: #64748b; width: 38%; font-weight: 600; }
  .amount { font-size: 28px; font-weight: 800; color: #4f46e5; margin-top: 20px; }
</style></head><body>
  <h1>SmartLibDesk</h1>
  <p class="muted">Payment invoice</p>
  <p class="amount">₹${Number(row.amount || 0).toFixed(2)}</p>
  <table>
    <tr><td>Library</td><td>${row.libraryName}</td></tr>
    <tr><td>Owner</td><td>${row.ownerName}</td></tr>
    <tr><td>Email</td><td>${row.email}</td></tr>
    <tr><td>Mobile</td><td>${row.mobile}</td></tr>
    <tr><td>Plan</td><td>${row.planName}</td></tr>
    <tr><td>Status</td><td>${row.status}</td></tr>
    <tr><td>Transaction ID</td><td>${row.transactionId}</td></tr>
    <tr><td>Razorpay ID</td><td>${row.razorpayPaymentId}</td></tr>
    <tr><td>Payment date</td><td>${fmtDate(row.paymentDate)}</td></tr>
    <tr><td>Expiry</td><td>${fmtDate(row.expiryDate)}</td></tr>
  </table>
</body></html>`;
}

export async function downloadPaymentInvoice(row: PaymentRow) {
  const html = invoiceHtml(row);

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const w = window.open('', '_blank');
      if (!w) {
        Alert.alert('Invoice', 'Allow pop-ups to download the invoice.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
      showDownloadSuccess(row.libraryName);
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice — ${row.libraryName}`,
        UTI: 'com.adobe.pdf',
      });
      showDownloadSuccess(row.libraryName);
    } else {
      showDownloadSuccess(row.libraryName);
    }
  } catch {
    Alert.alert('Download failed', 'Could not download invoice. Please try again.', [{ text: 'OK' }]);
  }
}

export function resendPaymentInvoice(row: PaymentRow) {
  Alert.alert(
    'Resend invoice',
    `When email is configured, the invoice for "${row.libraryName}" will be sent to ${row.email}.`,
    [{ text: 'OK' }]
  );
}
