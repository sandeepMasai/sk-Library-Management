const STORAGE_KEY = 'sld_attendance_qr_monthly';

export type CachedAttendanceQr = {
  token: string;
  expiresAt: string;
  monthKey: string;
  libraryId?: string;
};

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function clearAttendanceQrCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getCachedAttendanceQr(libraryId?: string | null): CachedAttendanceQr | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAttendanceQr;
    if (!parsed?.token || !parsed?.expiresAt || !parsed?.monthKey) return null;
    if (parsed.monthKey !== currentMonthKey()) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    if (libraryId && parsed.libraryId && parsed.libraryId !== libraryId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedAttendanceQr(token: string, expiresAt: string, libraryId?: string | null) {
  try {
    const payload: CachedAttendanceQr = {
      token,
      expiresAt,
      monthKey: currentMonthKey(),
      ...(libraryId ? { libraryId } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
}

/** Last 8 chars — lets admins compare website vs mobile QR without exposing full token. */
export function attendanceQrRef(token: string) {
  const t = String(token || '').trim();
  if (t.length < 8) return t || '—';
  return `…${t.slice(-8)}`;
}
