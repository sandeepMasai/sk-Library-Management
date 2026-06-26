import type { Ionicons } from '@expo/vector-icons';

export type ShiftType = 'morning' | 'evening' | 'full_day' | 'half_day' | 'custom';

export function shiftTypeLabel(t: string): string {
  switch (t) {
    case 'morning':
      return 'Morning';
    case 'evening':
      return 'Evening';
    case 'full_day':
      return 'Full Day';
    case 'half_day':
      return 'Half Day';
    default:
      return 'Custom';
  }
}

export function minutesToHHMM(totalMinutes: number): string {
  const m = Math.max(0, Math.min(1439, Math.round(Number(totalMinutes) || 0)));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function shiftTimeRange(startTime: number, endTime: number): string {
  return `${minutesToHHMM(startTime)}–${minutesToHHMM(endTime)}`;
}

export function shiftTone(t: string): { fg: string; bg: string; border: string } {
  if (t === 'morning') return { fg: '#A16207', bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.35)' };
  if (t === 'evening') return { fg: '#1D4ED8', bg: 'rgba(59,130,246,0.14)', border: 'rgba(59,130,246,0.35)' };
  if (t === 'full_day') return { fg: '#15803D', bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.35)' };
  if (t === 'half_day') return { fg: '#C2410C', bg: 'rgba(249,115,22,0.14)', border: 'rgba(249,115,22,0.35)' };
  return { fg: '#5B2B8C', bg: 'rgba(91,43,140,0.12)', border: 'rgba(91,43,140,0.28)' };
}

export function shiftIcon(t: string): keyof typeof Ionicons.glyphMap {
  switch (t) {
    case 'morning':
      return 'sunny-outline';
    case 'evening':
      return 'moon-outline';
    case 'full_day':
      return 'calendar-outline';
    case 'half_day':
      return 'time-outline';
    default:
      return 'options-outline';
  }
}

export const audienceGroupTones = {
  all: { fg: '#5B2B8C', bg: 'rgba(91,43,140,0.12)', border: 'rgba(91,43,140,0.35)' },
  active: { fg: '#15803D', bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.35)' },
  expired: { fg: '#DC2626', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' },
} as const;
