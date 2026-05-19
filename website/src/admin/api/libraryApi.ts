import { apiFetch, apiRaw } from '../../lib/http';

export type DashboardData = {
  ok: boolean;
  students: { total: number; active: number; expired: number; blocked: number };
  payments: { feeDueCount: number; collectedAmount: number; dueAmount: number; totalFeeAmount: number };
  attendance: { date: string; todayCount: number; attendancePct: number };
  renewalRequests?: { pending: number };
};

export type StudentRow = {
  id: string;
  name: string;
  mobile: string;
  username: string;
  feeStatus: string;
  feeAmount: number;
  expiryDate: string;
  isBlocked: boolean;
  joinDate?: string;
};

export type SeatRow = {
  _id: string;
  number: number;
  status: string;
  studentId?: string | null;
};

export type PlanRow = {
  _id: string;
  id?: string;
  key: string;
  name: string;
  finalPrice: number;
  duration: number;
  tag?: string | null;
  isTrial?: boolean;
};

export type AttendanceRow = {
  id: string;
  studentId: string;
  studentName?: string;
  attendanceDate: string;
  checkInTime?: string;
};

export async function fetchDashboard(): Promise<DashboardData> {
  return apiRaw<DashboardData>('/api/dashboard');
}

export async function fetchStudents(): Promise<StudentRow[]> {
  const data = await apiRaw<StudentRow[] | { students?: StudentRow[] }>('/api/students');
  if (Array.isArray(data)) return data;
  return (data as { students?: StudentRow[] }).students || [];
}

export async function createStudent(payload: {
  name: string;
  mobile: string;
  username: string;
  pin: string;
  feeAmount: number;
  feeStatus: string;
  membershipDays?: number;
}) {
  return apiRaw('/api/students', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      joinDate: new Date().toISOString(),
      feeMethod: 'cash',
      isBlocked: false,
      membershipDays: payload.membershipDays ?? 30,
    }),
  });
}

export async function toggleBlockStudent(id: string) {
  return apiRaw(`/api/students/${id}/block`, { method: 'PATCH' });
}

export async function deleteStudent(id: string) {
  return apiRaw(`/api/students/${id}`, { method: 'DELETE' });
}

export async function fetchAttendanceByDate(date: string): Promise<AttendanceRow[]> {
  return apiRaw<AttendanceRow[]>(`/api/attendance?date=${encodeURIComponent(date)}`);
}

export async function generateQrToken(rotate = false) {
  return apiRaw<{
    token: string;
    expiresAt: string;
    created?: boolean;
    locked?: boolean;
    message?: string;
  }>('/api/attendance/token', {
    method: 'POST',
    body: JSON.stringify({ rotate }),
  });
}

export async function fetchSeats(): Promise<SeatRow[]> {
  const data = await apiRaw<SeatRow[] | SeatRow[]>('/api/seats');
  return Array.isArray(data) ? data : [];
}

export async function setTotalSeats(totalSeats: number) {
  return apiRaw('/api/seats/set-total', {
    method: 'POST',
    body: JSON.stringify({ totalSeats }),
  });
}

export async function fetchPlans(): Promise<PlanRow[]> {
  const data = await apiRaw<{ plans: PlanRow[] }>('/api/plans');
  return (data.plans || []).map((p) => ({ ...p, id: p._id || p.id }));
}

export type SubscriptionMe = {
  plan?: string;
  currentPlanKey?: string;
  subscriptionStatus?: string;
  planExpiryDate?: string | null;
  planStartDate?: string | null;
  trialUsed?: boolean;
};

export async function fetchSubscriptionMe(): Promise<SubscriptionMe> {
  const data = await apiRaw<{ ok?: boolean; user?: SubscriptionMe } & SubscriptionMe>(
    '/api/subscription/me'
  );
  return data.user ?? data;
}

export async function fetchLibraryProfile() {
  return apiRaw<{ profile?: Record<string, unknown> }>('/api/library/profile');
}
