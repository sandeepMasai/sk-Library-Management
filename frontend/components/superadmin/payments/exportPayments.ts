import { Alert, Platform, ToastAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PaymentRow } from './types';

function escapeCsv(v: string) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: PaymentRow[]) {
  const headers = [
    'Library Name',
    'Owner Name',
    'Mobile',
    'Email',
    'Transaction ID',
    'Razorpay Payment ID',
    'Amount',
    'Plan',
    'Status',
    'Payment Date',
    'Expiry Date',
    'Subscription',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.libraryName,
        r.ownerName,
        r.mobile,
        r.email,
        r.transactionId,
        r.razorpayPaymentId,
        String(r.amount),
        r.planName,
        r.status,
        r.paymentDate || '',
        r.expiryDate || '',
        r.subscriptionActive ? 'Active' : 'Expired',
      ]
        .map((v) => escapeCsv(String(v)))
        .join(',')
    ),
  ];
  return lines.join('\n');
}

function exportFilename(ext: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `smartlibdesk-payments-${stamp}.${ext}`;
}

function showExportSuccess(format: string) {
  const message = `${format} file ready. Choose "Save to Files" or Downloads from the menu to save on your phone.`;
  if (Platform.OS === 'android') {
    ToastAndroid.show(`${format} download successful`, ToastAndroid.SHORT);
  }
  Alert.alert('Download successful', message, [{ text: 'OK' }]);
}

function ensureRows(rows: PaymentRow[]) {
  if (!rows.length) {
    Alert.alert('Export', 'No payments to export on this page.');
    return false;
  }
  return true;
}

function downloadBlobWeb(filename: string, content: string, mime: string) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

async function shareTextFileOnPhone(filename: string, content: string, mimeType: string, uti: string) {
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!dir) throw new Error('Storage not available');

  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: 'Save payment export',
    UTI: uti,
  });
}

function paymentsPdfHtml(rows: PaymentRow[]) {
  const head = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payments</title>
<style>
body{font-family:system-ui,sans-serif;padding:20px;color:#0f172a}
h1{font-size:20px;margin:0 0 4px}
.muted{color:#64748b;font-size:12px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
th{background:#f8fafc;font-weight:700}
</style></head><body>
<h1>SmartLibDesk — Payment Details</h1>
<p class="muted">${rows.length} records · ${new Date().toLocaleString('en-IN')}</p>
<table><thead><tr>
<th>Library</th><th>Owner</th><th>Mobile</th><th>Email</th><th>Amount</th><th>Plan</th><th>Status</th><th>Txn ID</th><th>Date</th>
</tr></thead><tbody>`;

  const body = rows
    .map(
      (r) =>
        `<tr>
<td>${r.libraryName}</td><td>${r.ownerName}</td><td>${r.mobile}</td><td>${r.email}</td>
<td>₹${r.amount}</td><td>${r.planName}</td><td>${r.status}</td>
<td>${r.transactionId}</td><td>${r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('en-IN') : '—'}</td>
</tr>`
    )
    .join('');

  return `${head}${body}</tbody></table></body></html>`;
}

async function sharePdfOnPhone(rows: PaymentRow[]) {
  const { uri } = await Print.printToFileAsync({ html: paymentsPdfHtml(rows) });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Save PDF',
    UTI: 'com.adobe.pdf',
  });
}

export async function exportPaymentsCsv(rows: PaymentRow[]) {
  if (!ensureRows(rows)) return;

  const csv = rowsToCsv(rows);
  const filename = exportFilename('csv');

  try {
    if (Platform.OS === 'web') {
      if (downloadBlobWeb(filename, csv, 'text/csv;charset=utf-8')) {
        showExportSuccess('CSV');
      }
      return;
    }

    await shareTextFileOnPhone(filename, csv, 'text/csv', 'public.comma-separated-values-text');
    showExportSuccess('CSV');
  } catch {
    Alert.alert('Download failed', 'Could not export CSV. Please try again.', [{ text: 'OK' }]);
  }
}

export async function exportPaymentsExcel(rows: PaymentRow[]) {
  if (!ensureRows(rows)) return;

  const csv = rowsToCsv(rows);
  const filename = exportFilename('xls');

  try {
    if (Platform.OS === 'web') {
      if (downloadBlobWeb(filename, csv, 'application/vnd.ms-excel')) {
        showExportSuccess('Excel');
      }
      return;
    }

    await shareTextFileOnPhone(filename, csv, 'application/vnd.ms-excel', 'com.microsoft.excel.xls');
    showExportSuccess('Excel');
  } catch {
    Alert.alert('Download failed', 'Could not export Excel file. Please try again.', [{ text: 'OK' }]);
  }
}

export async function exportPaymentsPdf(rows: PaymentRow[]) {
  if (!ensureRows(rows)) return;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const html = paymentsPdfHtml(rows);
      const w = window.open('', '_blank');
      if (!w) {
        Alert.alert('PDF', 'Allow pop-ups to export PDF.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
      showExportSuccess('PDF');
      return;
    }

    await sharePdfOnPhone(rows);
    showExportSuccess('PDF');
  } catch {
    Alert.alert('Download failed', 'Could not export PDF. Please try again.', [{ text: 'OK' }]);
  }
}

export async function printPaymentsTable(rows: PaymentRow[]) {
  await exportPaymentsPdf(rows);
}
