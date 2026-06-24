import { apiRaw } from './http';

export type StudentProfile = {
  id: string;
  role: 'student';
  name: string;
  username: string;
  mobile: string;
  joinDate?: string | null;
  expiryDate?: string | null;
  feeStatus?: string;
  feeAmount?: number;
  photoUrl?: string | null;
  isBlocked?: boolean;
  library?: {
    id?: string | null;
    libraryName?: string;
    logoUrl?: string | null;
  } | null;
};

export type StudentMeResponse = {
  student: StudentProfile;
  seat: { id: string; number: number } | null;
  attendance: {
    date: string;
    markedToday: boolean;
    month: string;
    monthCount: number;
  };
  notifications: Array<{
    id: string;
    title?: string;
    message?: string;
    date?: string;
  }>;
};

export async function fetchStudentMe(): Promise<StudentMeResponse> {
  const res = await apiRaw<{ ok?: boolean } & StudentMeResponse>('/api/student/me');
  if (!res.student?.id) throw new Error('Could not load student profile');
  return {
    student: res.student,
    seat: res.seat ?? null,
    attendance: res.attendance || { date: '', markedToday: false, month: '', monthCount: 0 },
    notifications: res.notifications || [],
  };
}

export type RenewalDuration = 30 | 90 | 180 | 365;

export type RenewalRequestStatus = 'pending' | 'approved' | 'rejected';

export type ShiftOption = {
  id: string;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
};

export type RenewContext = {
  libraryName: string;
  seatNumber: number | null;
  currentTiming: string;
  currentShiftId: string | null;
  shifts: ShiftOption[];
};

export type RenewalRequest = {
  id: string;
  libraryId: string | null;
  studentId: string | null;
  studentName: string;
  mobile: string;
  seatNumber: number | null;
  currentExpiryDate: string | null;
  currentFeeAmount: number;
  currentTiming: string;
  requestedDuration: RenewalDuration;
  requestedDurationLabel: string;
  requestedTiming: string;
  note: string;
  status: RenewalRequestStatus;
  rejectReason: string | null;
  newExpiryDate: string | null;
  createdAt: string | null;
};

export type RenewDashboard = RenewContext & {
  requests: RenewalRequest[];
};

export async function fetchRenewDashboard(): Promise<RenewDashboard> {
  const res = await apiRaw<{ ok?: boolean } & RenewDashboard>('/api/student/renew-dashboard');
  return {
    libraryName: res.libraryName || '',
    seatNumber: res.seatNumber ?? null,
    currentTiming: res.currentTiming || '',
    currentShiftId: res.currentShiftId ?? null,
    shifts: res.shifts || [],
    requests: res.requests || [],
  };
}

export async function submitRenewalRequest(payload: {
  requestedDuration: RenewalDuration;
  requestedTiming?: string;
  requestedShiftId?: string;
  note?: string;
}): Promise<RenewalRequest> {
  const res = await apiRaw<{ ok?: boolean; request: RenewalRequest }>('/api/student/renew-request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.request;
}
