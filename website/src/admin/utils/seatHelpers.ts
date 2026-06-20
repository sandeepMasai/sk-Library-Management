import type { AllocationRow, SeatRow, SpaceRow, StudentRow } from '../api/libraryApi';
import { formatDisplayName } from '../../utils/formatName';
import { deriveMembershipPlan, getStudentStatus } from './studentHelpers';

export type SeatTone = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'disabled';

export type EnrichedSeat = SeatRow & {
  seatId: string;
  tone: SeatTone;
  displayLabel: string;
  spaceName?: string;
  shiftName?: string;
  allocationId?: string;
  student?: StudentRow;
  membershipPlan?: string;
  membershipStatus?: string;
  daysToExpiry?: number | null;
};

export type SeatActivity = {
  id: string;
  label: string;
  time: string;
  icon: string;
};

export const SHIFT_TYPE_PRESETS = {
  morning: { startMin: 6 * 60, endMin: 12 * 60, label: 'Morning' },
  evening: { startMin: 14 * 60, endMin: 20 * 60, label: 'Evening' },
  full_day: { startMin: 6 * 60, endMin: 20 * 60, label: 'Full Day' },
  half_day: { startMin: 16 * 60, endMin: 20 * 60, label: 'Half Day' },
} as const;

export type ShiftTypeKey = keyof typeof SHIFT_TYPE_PRESETS;

const SEATS_PER_FLOOR = 40;
export const SEAT_GRID_COLS = 15;

export function seatMatrixLabel(number: number) {
  const within = (number - 1) % SEATS_PER_FLOOR;
  const row = Math.floor(within / SEAT_GRID_COLS);
  const col = within % SEAT_GRID_COLS;
  return `${String.fromCharCode(65 + Math.min(row, 25))}${col + 1}`;
}

export function displayLabel(seat: SeatRow) {
  return seat.label?.trim() || seatMatrixLabel(seat.number);
}

export function formatShiftTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function shiftTypeLabel(type: string) {
  if (type === 'morning') return 'Morning';
  if (type === 'evening') return 'Evening';
  if (type === 'full_day') return 'Full Day';
  if (type === 'half_day') return 'Half Day';
  return 'Custom';
}

export function shiftSaveName(type: string, startMin: number, endMin: number) {
  if (type === 'custom') {
    return `Custom ${formatShiftTime(startMin)}–${formatShiftTime(endMin)}`;
  }
  return shiftTypeLabel(type);
}

export function minutesToTimeInput(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function buildSpaceMap(spaces: SpaceRow[]) {
  return new Map(spaces.map((s) => [s.id, s]));
}

export function buildAllocationMap(allocations: AllocationRow[]) {
  const map = new Map<string, AllocationRow>();
  for (const a of allocations) {
    if (a.status === 'active' && a.seatId) map.set(a.seatId, a);
  }
  return map;
}

export function normalizeSeatId(seat: SeatRow) {
  return seat._id || seat.id || '';
}

function allocToStudent(alloc: AllocationRow, studentMap: Map<string, StudentRow>): StudentRow | undefined {
  if (alloc.student) {
    const s = alloc.student;
    return studentMap.get(s.id) || {
      id: s.id,
      name: formatDisplayName(s.name),
      mobile: s.mobile || '',
      username: s.username || '',
      feeStatus: 'paid',
      feeAmount: 0,
      expiryDate: '',
      isBlocked: false,
      photoUrl: s.photoUrl,
    };
  }
  return studentMap.get(alloc.studentId);
}

export function enrichSeat(
  seat: SeatRow,
  studentMap: Map<string, StudentRow>,
  opts?: {
    spaceMap?: Map<string, SpaceRow>;
    shiftName?: string;
    allocationBySeat?: Map<string, AllocationRow>;
    useAllocations?: boolean;
  }
): EnrichedSeat {
  const seatId = normalizeSeatId(seat);
  const alloc = opts?.allocationBySeat?.get(seatId);
  let student: StudentRow | undefined;
  let tone: SeatTone = 'available';

  if (seat.isActive === false || seat.status === 'inactive') {
    tone = 'disabled';
  } else if (opts?.useAllocations && alloc) {
    student = allocToStudent(alloc, studentMap);
    tone = 'occupied';
  } else if (!opts?.useAllocations && seat.studentId) {
    student = studentMap.get(String(seat.studentId));
    tone = seat.status === 'reserved' ? 'reserved' : 'occupied';
  } else if (seat.status === 'reserved') {
    tone = 'reserved';
  } else if (seat.status === 'maintenance') {
    tone = 'maintenance';
  }

  let daysToExpiry: number | null = null;
  if (student?.expiryDate) {
    daysToExpiry = Math.ceil((new Date(student.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  }

  const spaceName = seat.spaceId ? opts?.spaceMap?.get(seat.spaceId)?.name : undefined;

  return {
    ...seat,
    _id: seatId,
    seatId,
    tone,
    displayLabel: displayLabel(seat),
    spaceName,
    shiftName: opts?.shiftName,
    allocationId: alloc?.id,
    student,
    membershipPlan: student ? deriveMembershipPlan(student.joinDate, student.expiryDate) : undefined,
    membershipStatus: student ? getStudentStatus(student) : undefined,
    daysToExpiry,
  };
}

export function scopeStats(
  seats: SeatRow[],
  allocationBySeat: Map<string, AllocationRow>,
  spaceId: string | null,
  studentCount: number
) {
  const inScope = spaceId ? seats.filter((s) => (s.spaceId || null) === spaceId) : seats;
  const total = inScope.length;
  const filled = inScope.reduce((acc, s) => acc + (allocationBySeat.has(normalizeSeatId(s)) ? 1 : 0), 0);
  return { total, filled, vacant: total - filled, students: studentCount };
}

export function filterSeatCards(
  seats: EnrichedSeat[],
  search: string,
  statusFilter: 'all' | 'vacant' | 'occupied'
) {
  const q = search.trim().toLowerCase();
  let list = seats;
  if (q) {
    list = list.filter(
      (s) =>
        String(s.number).includes(q) ||
        s.displayLabel.toLowerCase().includes(q) ||
        s.student?.name.toLowerCase().includes(q) ||
        s.student?.mobile?.includes(q) ||
        s.student?.username?.toLowerCase().includes(q)
    );
  }
  if (statusFilter === 'occupied') return list.filter((s) => s.tone === 'occupied');
  if (statusFilter === 'vacant') return list.filter((s) => s.tone === 'available');
  return list;
}

export function seatStats(seats: EnrichedSeat[]) {
  const total = seats.length;
  const occupied = seats.filter((s) => s.tone === 'occupied').length;
  const reserved = seats.filter((s) => s.tone === 'reserved').length;
  const available = seats.filter((s) => s.tone === 'available').length;
  const disabled = seats.filter((s) => s.tone === 'disabled').length;
  const rate = total ? Math.round((occupied / total) * 100) : 0;
  return { total, occupied, reserved, available, disabled, rate };
}

export function exportSeatsCsv(seats: EnrichedSeat[]) {
  const header = ['Seat', 'Label', 'Space', 'Student', 'Phone', 'Status'];
  const rows = seats.map((s) =>
    [s.number, s.displayLabel, s.spaceName || '', s.student?.name || '', s.student?.mobile || '', s.tone].join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seats-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function toneClasses(tone: SeatTone, selected?: boolean) {
  const ring = selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#0f172a] scale-[1.02] shadow-md z-10' : 'hover:bg-white/15';
  if (tone === 'occupied') {
    return `${ring} border border-white/20 bg-white/12 text-white shadow-sm`;
  }
  if (tone === 'reserved') {
    return `${ring} border border-amber-400/35 bg-white/10 text-amber-100`;
  }
  if (tone === 'disabled') {
    return `${ring} border border-white/10 bg-white/5 text-white/40`;
  }
  if (tone === 'maintenance') {
    return `${ring} border border-white/15 bg-white/8 text-white/50`;
  }
  return `${ring} border border-white/15 bg-white/8 text-white/85`;
}

export function toneBadgeClass(tone: SeatTone) {
  if (tone === 'occupied') return 'border border-white/20 bg-white/12 text-white';
  if (tone === 'reserved') return 'border border-amber-400/35 bg-white/10 text-amber-100';
  if (tone === 'disabled') return 'border border-white/10 bg-white/5 text-white/50';
  if (tone === 'maintenance') return 'border border-white/15 bg-white/8 text-white/60';
  return 'border border-white/15 bg-white/8 text-white/85';
}

// Legacy exports for any remaining imports
export const DEFAULT_SEAT_FILTERS = {
  occupied: true,
  available: true,
  reserved: true,
  membershipActive: true,
  membershipExpiring: true,
  membershipExpired: true,
};

export function seatDisplayNumber(n: number) {
  return displayLabel({ _id: '', number: n, status: 'available' });
}

export function filterSeats(
  seats: EnrichedSeat[],
  query: string,
  _filters: typeof DEFAULT_SEAT_FILTERS,
  _floorFilter: string,
  spaceId?: string
) {
  let list = seats;
  if (spaceId && spaceId !== 'all') list = list.filter((s) => s.spaceId === spaceId);
  return filterSeatCards(list, query, 'all');
}

export function floorUtilization(seats: EnrichedSeat[]) {
  const map = new Map<string, { total: number; occupied: number }>();
  for (const seat of seats) {
    const label = seat.spaceName || `Seat ${seat.number}`;
    const row = map.get(label) || { total: 0, occupied: 0 };
    row.total += 1;
    if (seat.tone === 'occupied') row.occupied += 1;
    map.set(label, row);
  }
  return [...map.entries()].map(([label, v]) => ({
    label,
    pct: v.total ? Math.round((v.occupied / v.total) * 100) : 0,
  }));
}

export function expiringSeatAlerts(seats: EnrichedSeat[]) {
  return seats
    .filter((s) => s.student && s.daysToExpiry != null && s.daysToExpiry <= 7)
    .sort((a, b) => (a.daysToExpiry ?? 99) - (b.daysToExpiry ?? 99));
}

export function buildFloorMatrix(floorSeats: EnrichedSeat[]) {
  const sorted = [...floorSeats].sort((a, b) => a.number - b.number);
  const rows: EnrichedSeat[][] = [];
  for (let i = 0; i < sorted.length; i += SEAT_GRID_COLS) {
    rows.push(sorted.slice(i, i + SEAT_GRID_COLS));
  }
  return rows;
}

export function groupByFloor(seats: EnrichedSeat[]) {
  const map = new Map<string, EnrichedSeat[]>();
  for (const seat of seats) {
    const key = seat.spaceName || 'All';
    const list = map.get(key) || [];
    list.push(seat);
    map.set(key, list);
  }
  return [...map.entries()];
}
