import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QrImage, qrImageUrl } from '../../../components/QrImage';
import { Button } from '../../../components/ui/Button';
import { attendanceQrRef, currentMonthKey } from '../../utils/attendanceQrCache';

type AttendanceQrScannerProps = {
  open: boolean;
  token: string;
  expiresAt: string;
  loading: boolean;
  error: string;
  libraryName?: string;
  onClose: () => void;
};

function safeFileName(libraryName?: string) {
  return (libraryName || 'library').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
}

async function loadQrImage(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

/** PNG poster: library name on top, QR below. */
async function buildQrPosterBlob(token: string, libraryName?: string): Promise<Blob> {
  const title = libraryName?.trim() || 'Library';
  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const qrSize = 480;
  const pad = 40;
  const headerH = 100;
  const footerH = 44;
  const width = qrSize + pad * 2;
  const height = pad + headerH + qrSize + footerH + pad;

  const qrImg = await loadQrImage(qrImageUrl(token, qrSize));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1e5c52';
  ctx.font = 'bold 32px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, width / 2, pad);

  ctx.fillStyle = '#64748b';
  ctx.font = '16px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Attendance QR · ${monthLabel}`, width / 2, pad + 44);

  const qrX = pad;
  const qrY = pad + headerH;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Scan with SmartLibDesk mobile app', width / 2, qrY + qrSize + 16);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))), 'image/png');
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function printAttendanceQr(token: string, libraryName?: string) {
  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const title = libraryName?.trim() || 'Library';

  let posterUrl: string;
  let revokeAfterPrint = false;

  try {
    const blob = await buildQrPosterBlob(token, libraryName);
    posterUrl = URL.createObjectURL(blob);
    revokeAfterPrint = true;
  } catch {
    posterUrl = qrImageUrl(token, 400);
  }

  const win = window.open('', '_blank', 'width=520,height=720');
  if (!win) {
    if (revokeAfterPrint) URL.revokeObjectURL(posterUrl);
    window.alert('Pop-up blocked. Allow pop-ups for this site, then try Print again.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8" />
  <title>Attendance QR — ${title}</title>
  <style>
    @media print { body { margin: 0; padding: 12mm; } }
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; margin: 0; }
    h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
    p { color: #64748b; font-size: 0.875rem; margin: 0.5rem 0 1.5rem; }
    img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 12px; }
    .note { margin-top: 1.5rem; font-size: 0.75rem; color: #94a3b8; }
  </style>
</head><body>
  <h1>${title} — Attendance QR</h1>
  <p>${monthLabel}</p>
  <img id="qr" src="${posterUrl}" width="400" height="400" alt="Attendance QR" />
  <p class="note">Students scan with the SmartLibDesk mobile app</p>
</body></html>`);
  win.document.close();

  const img = win.document.getElementById('qr') as HTMLImageElement | null;
  const doPrint = () => {
    win.focus();
    win.print();
    if (revokeAfterPrint) {
      setTimeout(() => URL.revokeObjectURL(posterUrl), 60_000);
    }
  };

  if (img && !img.complete) {
    img.onload = doPrint;
    img.onerror = () => {
      window.alert('Could not load QR image for printing. Try Download QR instead.');
      win.close();
      if (revokeAfterPrint) URL.revokeObjectURL(posterUrl);
    };
  } else {
    doPrint();
  }
}

async function downloadAttendanceQr(token: string, libraryName?: string) {
  const filename = `attendance-qr-${safeFileName(libraryName)}-${currentMonthKey()}.png`;
  try {
    const blob = await buildQrPosterBlob(token, libraryName);
    triggerDownload(blob, filename);
  } catch {
    const imgUrl = qrImageUrl(token, 500);
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }
}

export function AttendanceQrScanner({
  open,
  token,
  expiresAt,
  loading,
  error,
  libraryName,
  onClose,
}: AttendanceQrScannerProps) {
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  const isExpiredError = /expired|membership|blocked/i.test(error);
  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="attendance-scanner-modal admin-card relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl">
        <div className="border-b border-slate-100 bg-gradient-to-br from-primary/10 to-white px-6 py-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-muted hover:bg-slate-100"
          >
            ✕
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">QR scanner</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-slate-900">📷 Scan student QR</h2>
          <p className="mt-1 text-sm text-muted">Students scan this code in the mobile app</p>
        </div>

        <div className="px-6 py-8 text-center" id="attendance-qr-print-area">
          {libraryName ? (
            <p className="mb-3 font-display text-lg font-bold text-slate-900">{libraryName}</p>
          ) : null}
          <div className="mx-auto max-w-[280px] rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-slate-50 to-white p-4">
            {token ? (
              <QrImage data={token} size={240} alt="Attendance QR" className="mx-auto shadow-lg" />
            ) : (
              <div className="admin-skeleton mx-auto h-60 w-60 rounded-xl" />
            )}
          </div>

          <p className="mt-3 text-xs font-medium text-primary">
            {monthLabel} ({currentMonthKey()}) — one QR per month
          </p>

          {expiresAt ? (
            <p className="mt-1 text-xs text-muted">
              Valid until {new Date(expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          ) : null}

          {token ? (
            <p className="mt-2 font-mono text-[11px] text-muted">
              Code ref: <span className="font-semibold text-slate-700">{attendanceQrRef(token)}</span>
              <span className="text-muted"> — match this on the mobile app</span>
            </p>
          ) : null}

          {isExpiredError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left">
              <p className="font-semibold text-rose-900">❌ Membership expired</p>
              <p className="mt-1 text-sm text-rose-800">Attendance not allowed for expired memberships.</p>
              <p className="mt-2 text-xs text-rose-700">
                Your membership has expired. Please renew to continue attendance access.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/admin/students">
                  <Button size="sm">Renew membership</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : error ? (
            <p className="mt-4 text-sm text-amber-800">{error}</p>
          ) : token ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="font-semibold text-emerald-800">✅ QR ready</p>
              <p className="text-sm text-emerald-700">
                Synced with mobile app — same code on website and library app
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              disabled={!token || loading || downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  await downloadAttendanceQr(token, libraryName);
                } finally {
                  setDownloading(false);
                }
              }}
            >
              {downloading ? 'Downloading…' : '⬇ Download QR'}
            </Button>
            <Button
              disabled={!token || loading || printing}
              variant="outline"
              onClick={async () => {
                setPrinting(true);
                try {
                  await printAttendanceQr(token, libraryName);
                } finally {
                  setPrinting(false);
                }
              }}
            >
              {printing ? 'Preparing…' : '🖨 Print QR'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>

          <p className="mt-4 text-[11px] text-muted">
            Same QR as the mobile library app. Students scan with the SmartLibDesk app.
          </p>
        </div>
      </div>
    </div>
  );
}
