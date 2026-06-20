import { API_URL, apiFetch, apiRaw, getAuthToken } from '../../lib/http';
import { formatDisplayName } from '../../utils/formatName';

function normalizeStudent(row: StudentRow): StudentRow {
  return { ...row, name: formatDisplayName(row.name) };
}

function normalizeAllocation(row: AllocationRow): AllocationRow {
  if (!row.student?.name) return row;
  return {
    ...row,
    student: { ...row.student, name: formatDisplayName(row.student.name) },
  };
}

export type DashboardData = {
  ok: boolean;
  students: { total: number; active: number; expired: number; blocked: number };
  payments: { feeDueCount: number; collectedAmount: number; dueAmount: number; totalFeeAmount: number };
  attendance: { date: string; todayCount: number; attendancePct: number };
  renewalRequests?: { pending: number };
};

export type StudentRow = {
  id: string;
  role?: string;
  libraryId?: string | null;
  name: string;
  mobile: string;
  username: string;
  feeStatus: string;
  feeAmount: number;
  feeMethod?: string;
  expiryDate: string;
  isBlocked: boolean;
  joinDate?: string;
  photoUrl?: string | null;
};

export type StudentAttendanceDay = {
  date: string;
  status: string;
};

export type UpdateStudentPayload = {
  name?: string;
  mobile?: string;
  username?: string;
  pin?: string;
  joinDate?: string;
  membershipDays?: 30 | 90 | 180 | 365;
  feeAmount?: number;
  feeStatus?: string;
  feeMethod?: 'cash' | 'upi';
  isBlocked?: boolean;
};

export type SeatRow = {
  _id: string;
  id?: string;
  number: number;
  label?: string | null;
  status: string;
  studentId?: string | null;
  spaceId?: string | null;
  isActive?: boolean;
};

export type SpaceRow = {
  id: string;
  name: string;
  order?: number;
};

export type ShiftRow = {
  id: string;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
};

export type AllocationRow = {
  id: string;
  seatId: string;
  shiftId: string;
  studentId: string;
  startDate: string;
  endDate: string;
  status: string;
  student?: { id: string; name: string; mobile?: string; username?: string; photoUrl?: string | null };
  seat?: { id: string; number: number; spaceId?: string | null };
  shift?: { id: string; name?: string | null; type?: string; startTime?: number; endTime?: number };
};

export type PlanRow = {
  _id: string;
  id?: string;
  key: string;
  name: string;
  description?: string;
  finalPrice: number;
  price?: number;
  strikePrice?: number | null;
  originalPrice?: number | null;
  savings?: number;
  duration: number;
  tag?: string | null;
  isTrial?: boolean;
  badges?: {
    recommended?: boolean;
    bestValue?: boolean;
    limitedTime?: boolean;
    exclusive?: boolean;
  };
  planType?: string;
};

export type AttendanceRow = {
  id: string;
  studentId: string;
  studentName?: string;
  date: string;
  attendanceDate?: string;
  checkInTime?: string;
  status: string;
};

export type BlockedAttemptRow = {
  id: string;
  studentId?: string | null;
  studentName?: string;
  membershipExpiryDate?: string | null;
  reason?: string;
  attemptedAt?: string | null;
};

export async function fetchAttendanceToday(): Promise<AttendanceRow[]> {
  const rows = await apiRaw<AttendanceRow[]>('/api/attendance/today');
  return rows.map((row) => ({
    ...row,
    studentName: row.studentName ? formatDisplayName(row.studentName) : row.studentName,
  }));
}

export async function fetchBlockedAttempts(limit = 50): Promise<BlockedAttemptRow[]> {
  const res = await apiRaw<{ ok?: boolean; attempts?: BlockedAttemptRow[] }>(
    `/api/attendance/blocked-attempts?limit=${limit}`
  );
  return (res.attempts ?? []).map((row) => ({
    ...row,
    studentName: row.studentName ? formatDisplayName(row.studentName) : row.studentName,
  }));
}

export async function fetchDashboard(): Promise<DashboardData> {
  return apiRaw<DashboardData>('/api/dashboard');
}

export async function fetchStudents(): Promise<StudentRow[]> {
  const data = await apiRaw<StudentRow[] | { students?: StudentRow[] }>('/api/students');
  const rows = Array.isArray(data) ? data : (data as { students?: StudentRow[] }).students || [];
  return rows.map(normalizeStudent);
}

export async function createStudent(payload: {
  name: string;
  mobile: string;
  username: string;
  pin: string;
  feeAmount: number;
  feeStatus: string;
  feeMethod?: 'cash' | 'upi';
  membershipDays?: number;
  joinDate?: string;
}): Promise<StudentRow> {
  return apiRaw<StudentRow>('/api/students', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      joinDate: payload.joinDate || new Date().toISOString(),
      feeMethod: payload.feeMethod || 'cash',
      isBlocked: false,
      membershipDays: payload.membershipDays ?? 30,
    }),
  }).then(normalizeStudent);
}

export async function toggleBlockStudent(id: string) {
  return apiRaw(`/api/students/${id}/block`, { method: 'PATCH' });
}

export async function deleteStudent(id: string) {
  return apiRaw(`/api/students/${id}`, { method: 'DELETE' });
}

/** Fresh row from GET /api/students (no single-student endpoint for library role). */
export async function fetchStudentById(id: string): Promise<StudentRow | null> {
  const students = await fetchStudents();
  return students.find((s) => s.id === id) ?? null;
}

export async function updateStudent(id: string, payload: UpdateStudentPayload): Promise<StudentRow> {
  const row = await apiRaw<StudentRow>(`/api/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return normalizeStudent(row);
}

export async function uploadStudentPhoto(studentId: string, file: File): Promise<StudentRow> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch(`${API_URL}/api/students/${studentId}/photo`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  const body = (await res.json().catch(() => ({}))) as StudentRow & { message?: string };
  if (!res.ok) {
    throw new Error(body.message || `Photo upload failed (${res.status})`);
  }
  return normalizeStudent(body);
}

export async function fetchStudentAttendance(
  studentId: string,
  year?: number,
  month?: number
): Promise<StudentAttendanceDay[]> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const data = await apiRaw<StudentAttendanceDay[]>(
    `/api/attendance/student/${encodeURIComponent(studentId)}?year=${y}&month=${m}`
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchAttendanceByDate(date: string): Promise<AttendanceRow[]> {
  const data = await apiRaw<AttendanceRow[] | AttendanceRow[]>(
    `/api/attendance?date=${encodeURIComponent(date)}`
  );
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => ({
    ...row,
    studentName: row.studentName ? formatDisplayName(row.studentName) : row.studentName,
  }));
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
  const data = await apiFetch<SeatRow[]>('/api/seats');
  const list = Array.isArray(data) ? data : [];
  return list.map((s) => ({
    ...s,
    _id: s._id || s.id || '',
    label: s.label ?? null,
    isActive: s.isActive !== false,
  }));
}

export async function bulkCreateSeats(totalSeats: number, spaceId?: string | null) {
  const data = await apiFetch<SeatRow[]>('/api/seats/bulk-create', {
    method: 'POST',
    body: JSON.stringify({ totalSeats, spaceId: spaceId ?? null }),
  });
  return Array.isArray(data) ? data : [];
}

export async function updateSeatSpace(seatId: string, spaceId: string | null) {
  return apiFetch<SeatRow>(`/api/seats/${seatId}`, {
    method: 'PATCH',
    body: JSON.stringify({ spaceId }),
  });
}

export async function fetchSpaces(): Promise<SpaceRow[]> {
  const data = await apiFetch<SpaceRow[]>('/api/spaces');
  return Array.isArray(data) ? data.map((s) => ({ ...s, id: s.id || (s as { _id?: string })._id || '' })) : [];
}

export async function createSpace(name: string, order = 0) {
  return apiFetch<SpaceRow>('/api/spaces', { method: 'POST', body: JSON.stringify({ name, order }) });
}

export async function updateSpace(id: string, patch: { name?: string; order?: number }) {
  return apiFetch<SpaceRow>(`/api/spaces/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteSpace(id: string) {
  return apiFetch(`/api/spaces/${id}`, { method: 'DELETE' });
}

export async function fetchShifts(): Promise<ShiftRow[]> {
  const data = await apiFetch<ShiftRow[]>('/api/shifts');
  return Array.isArray(data) ? data.map((s) => ({ ...s, id: s.id || (s as { _id?: string })._id || '' })) : [];
}

export async function createShift(payload: {
  name: string;
  type: string;
  startTime: string | number;
  endTime: string | number;
}) {
  return apiFetch<ShiftRow>('/api/shifts', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateShift(
  id: string,
  patch: { name?: string; type?: string; startTime?: string | number; endTime?: string | number }
) {
  return apiFetch<ShiftRow>(`/api/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteShift(id: string) {
  return apiFetch(`/api/shifts/${id}`, { method: 'DELETE' });
}

export async function fetchAllocations(params?: { shiftId?: string; spaceId?: string }) {
  const q = new URLSearchParams();
  if (params?.shiftId) q.set('shiftId', params.shiftId);
  if (params?.spaceId) q.set('spaceId', params.spaceId);
  const suffix = q.toString() ? `?${q}` : '';
  const data = await apiFetch<AllocationRow[]>(`/api/allocations${suffix}`);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(normalizeAllocation);
}

export async function assignAllocation(payload: {
  seatId: string;
  studentId: string;
  shiftId: string;
  startDate: string;
  endDate: string;
}) {
  return apiFetch<AllocationRow>('/api/allocations', { method: 'POST', body: JSON.stringify(payload) });
}

export async function cancelAllocation(allocationId: string) {
  return apiFetch<AllocationRow>(`/api/allocations/${allocationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled' }),
  });
}

export async function setTotalSeats(totalSeats: number) {
  return apiRaw('/api/seats/set-total', {
    method: 'POST',
    body: JSON.stringify({ totalSeats }),
  });
}

export async function assignSeat(seatId: string, studentId: string) {
  return apiRaw(`/api/seats/${seatId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ seatId, studentId }),
  });
}

export async function unassignSeat(seatId: string) {
  return apiRaw(`/api/seats/${seatId}/unassign`, {
    method: 'POST',
    body: JSON.stringify({ seatId }),
  });
}

export async function updateAttendanceSettings(attendanceActiveMembersOnly: boolean) {
  return apiRaw('/api/library/attendance-settings', {
    method: 'PATCH',
    body: JSON.stringify({ attendanceActiveMembersOnly }),
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

export type LibraryProfileUpdatePayload = {
  name: string;
  libraryName: string;
  city: string;
  phone?: string;
  state?: string;
  place?: string;
  pincode?: string;
  address?: string;
  whatsappNumber?: string;
};

export async function updateLibraryProfile(payload: LibraryProfileUpdatePayload) {
  return apiRaw<{ ok?: boolean; profile?: Record<string, unknown> }>('/api/library/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function uploadLibraryLogo(file: File) {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('logo', file);

  const res = await fetch(`${API_URL}/api/library/logo`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    logoUrl?: string;
    profile?: Record<string, unknown>;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || `Logo upload failed (${res.status})`);
  }
  return body;
}

export type LibraryNotification = {
  id: string;
  title: string;
  message: string;
  date?: string;
  readByMe?: boolean;
  targetType?: string;
  category?: string;
};

export async function fetchNotifications(params?: { limit?: number; page?: number }): Promise<LibraryNotification[]> {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.page) q.set('page', String(params.page));
  const suffix = q.toString() ? `?${q}` : '';
  const data = await apiRaw<LibraryNotification[]>(`/api/notifications${suffix}`);
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRaw(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function sendNotification(body: {
  title: string;
  message: string;
  targetType?: 'all' | 'student' | 'library';
  targetId?: string;
  category?: string;
}) {
  return apiRaw('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type CommunicationStats = {
  totalSent: number;
  delivered: number;
  read: number;
  pending: number;
  campaignCount: number;
};

export async function fetchCommunicationStats(): Promise<CommunicationStats> {
  const res = await apiRaw<{ ok?: boolean; stats?: CommunicationStats }>('/api/communications/stats');
  return (
    res.stats ?? {
      totalSent: 0,
      delivered: 0,
      read: 0,
      pending: 0,
      campaignCount: 0,
    }
  );
}

export type CommunicationMessage = {
  id: string;
  title: string;
  message: string;
  imageUrl?: string | null;
  messageType?: string;
  audienceLabel?: string;
  recipientCount?: number;
  readCount?: number;
  sentAt?: string | null;
};

export async function fetchCommunicationHistory(limit = 10): Promise<CommunicationMessage[]> {
  const res = await apiRaw<{ ok?: boolean; history?: CommunicationMessage[] }>(
    `/api/communications/history?limit=${limit}`
  );
  return res.history ?? [];
}

export type RenewalRequestRow = {
  id: string;
  studentId?: string | null;
  studentName: string;
  status: string;
  mobile?: string;
  createdAt?: string | null;
};

export async function fetchRenewalRequests(status = 'all'): Promise<{
  pendingCount: number;
  requests: RenewalRequestRow[];
}> {
  const res = await apiRaw<{ ok?: boolean; pendingCount?: number; requests?: RenewalRequestRow[] }>(
    `/api/library/renew-requests?status=${encodeURIComponent(status)}`
  );
  return {
    pendingCount: res.pendingCount ?? 0,
    requests: (res.requests ?? []).map((row) => ({
      ...row,
      studentName: formatDisplayName(row.studentName),
    })),
  };
}

export type StudentPaymentRow = {
  id: string;
  studentId?: string | null;
  studentName: string;
  amount: number;
  paymentDate?: string | null;
  createdAt?: string | null;
  status: string;
  durationLabel?: string;
  feeMethod?: string;
  expiryDate?: string | null;
};

export type BillingHistoryItem =
  | {
      id: string;
      type: 'payment';
      amount: number;
      plan: string;
      status: string;
      method: string;
      invoiceUrl: string | null;
      orderId: string;
      paymentId: string;
      createdAt: string | null;
    }
  | {
      id: string;
      type: 'subscription';
      status: string;
      plan: string;
      amount: number;
      reason: string | null;
      note: string | null;
      expiryDate: string | null;
      createdAt: string | null;
    };

export async function fetchBillingHistory(): Promise<BillingHistoryItem[]> {
  const data = await apiRaw<{ ok?: boolean; items?: BillingHistoryItem[] }>('/api/payment/history');
  return data.items ?? [];
}

export async function fetchStudentPayments(studentId?: string): Promise<StudentPaymentRow[]> {
  const q = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  const res = await apiRaw<{ ok?: boolean; payments?: StudentPaymentRow[] }>(
    `/api/library/student-payments${q}`
  );
  return (res.payments ?? []).map((row) => ({
    ...row,
    studentName: formatDisplayName(row.studentName),
  }));
}

export async function approveRenewalRequest(
  id: string,
  body?: { amount?: number; feeStatus?: string; feeMethod?: string }
) {
  return apiRaw(`/api/library/renew-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export async function rejectRenewalRequest(id: string, reason?: string) {
  return apiRaw(`/api/library/renew-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Rejected by library' }),
  });
}
