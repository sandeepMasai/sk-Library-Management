import type { AttendanceRow, BlockedAttemptRow, StudentRow } from '../api/libraryApi';
import { formatDisplayName } from '../../utils/formatName';

export type EnrichedAttendanceRow = {
  id: string;
  studentId: string;
  studentName: string;
  seatNumber: number | null;
  checkIn: string;
  checkOut: string;
  duration: string;
  status: 'present' | 'absent' | 'late';
  statusLabel: string;
  rawDate: string;
  isLate: boolean;
};

export type LiveFeedItem = {
  id: string;
  time: string;
  label: string;
  type: 'checkin' | 'blocked';
  studentName?: string;
};

export type TrendPoint = {
  label: string;
  dateStr: string;
  value: number;
  rate: number;
};

export type StudentAttendanceRank = {
  studentId: string;
  studentName: string;
  pct: number;
  presentDays: number;
};

export function formatCheckInTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function isLateCheckIn(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getHours() > 10 || (d.getHours() === 10 && d.getMinutes() > 0);
}

export function enrichAttendanceRow(
  row: AttendanceRow,
  studentMap: Map<string, StudentRow>,
  seatMap: Map<string, number>
): EnrichedAttendanceRow {
  const student = studentMap.get(row.studentId);
  const rawDate = row.date || row.attendanceDate || row.checkInTime || '';
  const late = isLateCheckIn(rawDate);
  const status = row.status === 'absent' ? 'absent' : late ? 'late' : 'present';

  return {
    id: row.id,
    studentId: row.studentId,
    studentName: formatDisplayName(row.studentName || student?.name || 'Student'),
    seatNumber: seatMap.get(String(row.studentId)) ?? null,
    checkIn: formatCheckInTime(rawDate),
    checkOut: '—',
    duration: '—',
    status,
    statusLabel: status === 'present' ? 'Present' : status === 'late' ? 'Late' : 'Absent',
    rawDate,
    isLate: late,
  };
}

export function buildLiveFeed(
  attendance: EnrichedAttendanceRow[],
  blocked: BlockedAttemptRow[]
): LiveFeedItem[] {
  const items: LiveFeedItem[] = [];

  for (const row of attendance) {
    items.push({
      id: `in-${row.id}`,
      time: row.checkIn,
      label: `${row.studentName} checked in`,
      type: 'checkin',
      studentName: row.studentName,
    });
  }

  for (const b of blocked) {
    items.push({
      id: `blk-${b.id}`,
      time: formatCheckInTime(b.attemptedAt || undefined),
      label: b.studentName ? `Attendance blocked — ${b.studentName}` : 'Attendance blocked — membership expired',
      type: 'blocked',
      studentName: b.studentName,
    });
  }

  return items.sort((a, b) => {
    const ta = a.time === '—' ? 0 : Date.parse(`1970-01-01 ${a.time}`);
    const tb = b.time === '—' ? 0 : Date.parse(`1970-01-01 ${b.time}`);
    return tb - ta;
  });
}

export function exportAttendanceCsv(rows: EnrichedAttendanceRow[], dateLabel: string) {
  const header = ['Student', 'Seat', 'Check In', 'Check Out', 'Duration', 'Status'];
  const lines = rows.map((r) =>
    [r.studentName, r.seatNumber ?? '', r.checkIn, r.checkOut, r.duration, r.statusLabel].join(',')
  );
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-${dateLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function lastNDays(n: number) {
  const points: { dateStr: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    points.push({
      dateStr: day.toISOString().slice(0, 10),
      label:
        n <= 7
          ? day.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)
          : day.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    });
  }
  return points;
}

export function computeRankings(
  students: StudentRow[],
  monthPresence: Map<string, number>
): { top: StudentAttendanceRank[]; low: StudentAttendanceRank[] } {
  const elapsed = new Date().getDate();
  const ranks: StudentAttendanceRank[] = students.map((s) => {
    const presentDays = monthPresence.get(s.id) ?? 0;
    const pct = elapsed > 0 ? Math.min(100, Math.round((presentDays / elapsed) * 100)) : 0;
    return { studentId: s.id, studentName: formatDisplayName(s.name), pct, presentDays };
  });

  const top = [...ranks].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const low = ranks.filter((r) => r.pct < 50 && r.presentDays >= 0).sort((a, b) => a.pct - b.pct).slice(0, 5);

  return { top, low };
}

export function aggregatePresenceByStudent(dailyRows: AttendanceRow[][]) {
  const map = new Map<string, number>();
  for (const day of dailyRows) {
    const seen = new Set<string>();
    for (const row of day) {
      if (!row.studentId || seen.has(row.studentId)) continue;
      seen.add(row.studentId);
      map.set(row.studentId, (map.get(row.studentId) ?? 0) + 1);
    }
  }
  return map;
}

export function statusPill(status: EnrichedAttendanceRow['status']) {
  if (status === 'late') {
    return { label: 'Late', className: 'border border-amber-400/35 bg-white/10 text-amber-200' };
  }
  if (status === 'absent') {
    return { label: 'Absent', className: 'border border-rose-400/35 bg-white/10 text-rose-200' };
  }
  return { label: 'Present', className: 'border border-white/15 bg-white/10 text-white' };
}
