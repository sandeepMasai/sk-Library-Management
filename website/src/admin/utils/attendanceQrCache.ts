const STORAGE_KEY = 'sld_attendance_qr_monthly';

export type CachedAttendanceQr = {
  token: string;
  expiresAt: string;
  monthKey: string;
};

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getCachedAttendanceQr(): CachedAttendanceQr | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAttendanceQr;
    if (!parsed?.token || !parsed?.expiresAt || !parsed?.monthKey) return null;
    if (parsed.monthKey !== currentMonthKey()) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedAttendanceQr(token: string, expiresAt: string) {
  try {
    const payload: CachedAttendanceQr = {
      token,
      expiresAt,
      monthKey: currentMonthKey(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
}
