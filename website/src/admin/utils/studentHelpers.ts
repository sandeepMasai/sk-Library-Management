import type { AllocationRow, RenewalRequestRow, SeatRow, StudentPaymentRow, StudentRow } from '../api/libraryApi';
import { formatDisplayName } from '../../utils/formatName';

export type StudentFilter = 'all' | 'active' | 'expired' | 'fee_due' | 'expiring';

export type StudentStatus = 'active' | 'expiring' | 'expired' | 'blocked';

export type AdvancedFilters = {
  statusActive: boolean;
  statusExpired: boolean;
  statusExpiring: boolean;
  membershipMonthly: boolean;
  membershipQuarterly: boolean;
  membershipYearly: boolean;
  feePaid: boolean;
  feePending: boolean;
  attendanceRegular: boolean;
  attendanceLow: boolean;
  seatAssigned: boolean;
  seatUnassigned: boolean;
};

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  statusActive: true,
  statusExpired: true,
  statusExpiring: true,
  membershipMonthly: true,
  membershipQuarterly: true,
  membershipYearly: true,
  feePaid: true,
  feePending: true,
  attendanceRegular: true,
  attendanceLow: true,
  seatAssigned: true,
  seatUnassigned: true,
};

export type EnrichedStudent = StudentRow & {
  displayId: string;
  seatNumber: number | null;
  seatId: string | null;
  seatLabel: string | null;
  shiftName: string | null;
  membershipPlan: string;
  attendancePct: number | null;
  presentToday: boolean;
  feeDue: boolean;
};

function seatRowId(seat: SeatRow) {
  return seat._id || seat.id || '';
}

export type StudentSeatInfo = {
  number: number;
  seatId: string;
  status: string;
  label?: string | null;
  shiftName?: string | null;
};

export function buildSeatMaps(seats: SeatRow[], allocations: AllocationRow[] = []) {
  const seatById = new Map<string, SeatRow>();
  for (const seat of seats) {
    seatById.set(seatRowId(seat), seat);
  }

  const byStudent = new Map<string, StudentSeatInfo>();

  for (const alloc of allocations) {
    if (alloc.status !== 'active' || !alloc.seatId) continue;
    const studentKey = String(alloc.student?.id || alloc.studentId || '');
    if (!studentKey) continue;
    const seat = seatById.get(alloc.seatId);
    const number = seat?.number ?? alloc.seat?.number;
    if (number == null) continue;
    byStudent.set(studentKey, {
      number,
      seatId: alloc.seatId,
      status: 'occupied',
      label: seat?.label ?? null,
      shiftName: alloc.shift?.name ?? null,
    });
  }

  for (const seat of seats) {
    if (!seat.studentId) continue;
    const studentKey = String(seat.studentId);
    if (byStudent.has(studentKey)) continue;
    byStudent.set(studentKey, {
      number: seat.number,
      seatId: seatRowId(seat),
      status: seat.status,
      label: seat.label ?? null,
    });
  }

  return byStudent;
}

export function buildStudentSeatNumberMap(seats: SeatRow[], allocations: AllocationRow[] = []) {
  const byStudent = buildSeatMaps(seats, allocations);
  return new Map([...byStudent.entries()].map(([studentId, info]) => [studentId, info.number]));
}

export function getStudentStatus(student: StudentRow): StudentStatus {
  if (student.isBlocked) return 'blocked';
  const expiry = student.expiryDate ? new Date(student.expiryDate).getTime() : 0;
  const now = Date.now();
  if (expiry && expiry < now) return 'expired';
  const week = 7 * 24 * 60 * 60 * 1000;
  if (expiry && expiry >= now && expiry <= now + week) return 'expiring';
  const fee = String(student.feeStatus || '').toLowerCase();
  if (fee.includes('pending') || fee.includes('due') || fee.includes('half')) return 'expiring';
  return 'active';
}

export function statusBadge(student: StudentRow) {
  const status = getStudentStatus(student);
  if (status === 'blocked') {
    return { label: 'Blocked', className: 'border border-white/15 bg-white/8 text-white/60' };
  }
  if (status === 'expired') {
    return { label: 'Expired', className: 'border border-rose-400/35 bg-white/10 text-rose-200' };
  }
  if (status === 'expiring') {
    return { label: 'Expiring soon', className: 'border border-amber-400/35 bg-white/10 text-amber-200' };
  }
  return { label: 'Active', className: 'border border-white/15 bg-white/10 text-white' };
}

export function formatExpiry(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function studentDisplayId(student: StudentRow) {
  return `ST${student.id.slice(-4).toUpperCase()}`;
}

export function deriveMembershipPlan(joinDate?: string, expiryDate?: string) {
  if (!joinDate || !expiryDate) return 'Monthly';
  const days = Math.round(
    (new Date(expiryDate).getTime() - new Date(joinDate).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (days >= 330) return 'Yearly';
  if (days >= 150) return 'Half-yearly';
  if (days >= 60) return 'Quarterly';
  return 'Monthly';
}

export function deriveMembershipDays(joinDate?: string, expiryDate?: string): 30 | 90 | 180 | 365 {
  if (!joinDate || !expiryDate) return 30;
  const days = Math.round(
    (new Date(expiryDate).getTime() - new Date(joinDate).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (days >= 330) return 365;
  if (days >= 150) return 180;
  if (days >= 60) return 90;
  return 30;
}

export type StudentAddDefaults = {
  feeAmount: number;
  feeStatus: 'Paid' | 'Half Paid' | 'Pending';
  membershipDays: 30 | 90 | 180 | 365;
  feeMethod: 'cash' | 'upi';
};

function modeValue<T extends string | number>(values: T[]): T | null {
  if (!values.length) return null;
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  let best: T = values[0];
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/** Derive add-student defaults from existing library students (backend list). */
export function studentAddDefaultsFromList(students: StudentRow[]): StudentAddDefaults {
  const recent = students.slice(0, 30);
  if (!recent.length) {
    return { feeAmount: 500, feeStatus: 'Pending', membershipDays: 30, feeMethod: 'cash' };
  }

  const feeAmount = modeValue(recent.map((s) => Math.round(Number(s.feeAmount) || 0))) ?? 500;
  const membershipDays = modeValue(
    recent.map((s) => deriveMembershipDays(s.joinDate, s.expiryDate))
  ) ?? 30;
  const feeStatus =
    modeValue(
      recent.map((s) => {
        const fee = String(s.feeStatus || '').trim();
        if (fee === 'Paid' || fee === 'Half Paid' || fee === 'Pending') return fee;
        return 'Pending';
      })
    ) ?? 'Pending';
  const feeMethod = modeValue(
    recent.map((s) => (s.feeMethod === 'upi' ? 'upi' : 'cash') as 'cash' | 'upi')
  ) ?? 'cash';

  return {
    feeAmount: Math.max(0, feeAmount),
    feeStatus: feeStatus as StudentAddDefaults['feeStatus'],
    membershipDays,
    feeMethod,
  };
}

export function membershipBucket(plan: string): 'monthly' | 'quarterly' | 'yearly' {
  const p = plan.toLowerCase();
  if (p.includes('year')) return 'yearly';
  if (p.includes('quarter') || p.includes('half')) return 'quarterly';
  return 'monthly';
}

export function isFeeDue(student: StudentRow) {
  const fee = String(student.feeStatus || '').toLowerCase();
  return fee.includes('pending') || fee.includes('half') || fee.includes('due');
}

export function calcAttendancePct(presentDays: number, monthDaysElapsed?: number) {
  const now = new Date();
  const elapsed = monthDaysElapsed ?? now.getDate();
  if (elapsed <= 0) return 0;
  return Math.min(100, Math.round((presentDays / elapsed) * 100));
}

export function enrichStudent(
  student: StudentRow,
  seatMap: Map<string, StudentSeatInfo>,
  attendancePctMap: Map<string, number>,
  presentTodaySet: Set<string>
): EnrichedStudent {
  const seat = seatMap.get(String(student.id));
  return {
    ...student,
    name: formatDisplayName(student.name),
    displayId: studentDisplayId(student),
    seatNumber: seat?.number ?? null,
    seatId: seat?.seatId ?? null,
    seatLabel: seat?.label ?? null,
    shiftName: seat?.shiftName ?? null,
    membershipPlan: deriveMembershipPlan(student.joinDate, student.expiryDate),
    attendancePct: attendancePctMap.get(student.id) ?? null,
    presentToday: presentTodaySet.has(student.id),
    feeDue: isFeeDue(student),
  };
}

export function matchesSearch(
  student: EnrichedStudent,
  query: string,
  searchField: 'all' | 'name' | 'phone' | 'email' | 'id' | 'seat'
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (searchField === 'name') return student.name.toLowerCase().includes(q);
  if (searchField === 'phone') return student.mobile.includes(q.replace(/\D/g, '').slice(-10));
  if (searchField === 'email') return student.username.toLowerCase().includes(q);
  if (searchField === 'id')
    return student.id.toLowerCase().includes(q) || student.displayId.toLowerCase().includes(q);
  if (searchField === 'seat') {
    const seatQ = q.replace(/seat\s*/i, '');
    return student.seatNumber != null && String(student.seatNumber).includes(seatQ);
  }

  return (
    student.name.toLowerCase().includes(q) ||
    student.mobile.includes(q) ||
    student.username.toLowerCase().includes(q) ||
    student.displayId.toLowerCase().includes(q) ||
    student.id.toLowerCase().includes(q) ||
    (student.seatNumber != null && String(student.seatNumber).includes(q))
  );
}

export function applyAdvancedFilters(student: EnrichedStudent, filters: AdvancedFilters) {
  const status = getStudentStatus(student);
  const statusOk =
    (filters.statusActive && status === 'active') ||
    (filters.statusExpired && status === 'expired') ||
    (filters.statusExpiring && status === 'expiring') ||
    (filters.statusActive && status === 'blocked');

  if (!statusOk && !(filters.statusExpired && status === 'blocked')) {
    const anyStatus = filters.statusActive || filters.statusExpired || filters.statusExpiring;
    if (anyStatus && status === 'blocked' && !filters.statusExpired) return false;
    if (anyStatus && !statusOk) return false;
  }

  const bucket = membershipBucket(student.membershipPlan);
  const membershipOk =
    (bucket === 'monthly' && filters.membershipMonthly) ||
    (bucket === 'quarterly' && filters.membershipQuarterly) ||
    (bucket === 'yearly' && filters.membershipYearly);
  if (!membershipOk) return false;

  const fee = String(student.feeStatus || '').toLowerCase();
  const feeOk =
    (filters.feePaid && fee.includes('paid')) ||
    (filters.feePending && (fee.includes('pending') || fee.includes('half')));
  if (!feeOk) return false;

  const pct = student.attendancePct ?? 0;
  const attendanceOk =
    (filters.attendanceRegular && pct >= 70) ||
    (filters.attendanceLow && pct < 70);
  if (student.attendancePct != null && !attendanceOk) return false;

  const seatOk =
    (filters.seatAssigned && student.seatNumber != null) ||
    (filters.seatUnassigned && student.seatNumber == null);
  if (!seatOk) return false;

  return true;
}

export function filterStudentsAdvanced(
  students: EnrichedStudent[],
  query: string,
  searchField: 'all' | 'name' | 'phone' | 'email' | 'id' | 'seat',
  filters: AdvancedFilters,
  legacyFilter: StudentFilter
) {
  return students.filter((student) => {
    const status = getStudentStatus(student);
    if (legacyFilter === 'active' && status !== 'active') return false;
    if (legacyFilter === 'expired' && status !== 'expired') return false;
    if (legacyFilter === 'expiring' && status !== 'expiring') return false;
    if (legacyFilter === 'fee_due' && !student.feeDue) return false;
    if (!matchesSearch(student, query, searchField)) return false;
    return applyAdvancedFilters(student, filters);
  });
}

export function studentStats(students: StudentRow[]) {
  let active = 0;
  let expired = 0;
  let expiring = 0;
  let feeDue = 0;
  for (const s of students) {
    const st = getStudentStatus(s);
    if (st === 'active') active += 1;
    if (st === 'expired') expired += 1;
    if (st === 'expiring') expiring += 1;
    if (isFeeDue(s)) feeDue += 1;
  }
  return { total: students.length, active, expired, expiring, feeDue };
}

export function exportStudentsCsv(students: EnrichedStudent[]) {
  const header = [
    'Name',
    'Student ID',
    'Mobile',
    'Username',
    'Seat',
    'Membership',
    'Fee Status',
    'Fee Amount',
    'Attendance %',
    'Expiry',
    'Status',
  ];
  const rows = students.map((s) =>
    [
      s.name,
      s.displayId,
      s.mobile,
      s.username,
      s.seatNumber ?? '',
      s.membershipPlan,
      s.feeStatus,
      s.feeAmount,
      s.attendancePct ?? '',
      s.expiryDate || '',
      statusBadge(s).label,
    ].join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildStudentTimeline(
  student: StudentRow,
  payments: StudentPaymentRow[],
  renewals: RenewalRequestRow[],
  presentDays: number
) {
  const items: { label: string; date: string; icon: string }[] = [];

  if (student.joinDate) {
    items.push({ label: 'Student added', date: student.joinDate, icon: '👤' });
  }

  for (const p of payments) {
    items.push({
      label: `Fee collected · ₹${p.amount}`,
      date: p.paymentDate || p.createdAt || '',
      icon: '💰',
    });
  }

  if (presentDays > 0) {
    items.push({
      label: `Attendance marked (${presentDays} days this month)`,
      date: new Date().toISOString(),
      icon: '✅',
    });
  }

  for (const r of renewals) {
    if (r.status === 'approved') {
      items.push({
        label: 'Membership renewed',
        date: r.createdAt || '',
        icon: '🔄',
      });
    }
  }

  return items
    .filter((i) => i.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function paymentsForStudent(payments: StudentPaymentRow[], studentId: string) {
  return payments.filter((p) => p.studentId === studentId);
}

export function feeSummary(student: StudentRow, payments: StudentPaymentRow[]) {
  const studentPayments = paymentsForStudent(payments, student.id);
  const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const last = studentPayments[0];
  const pending =
    String(student.feeStatus || '').toLowerCase().includes('paid') && !String(student.feeStatus).toLowerCase().includes('half')
      ? 0
      : Math.max(0, student.feeAmount - totalPaid);
  return { totalPaid: totalPaid || student.feeAmount, pending, last };
}
