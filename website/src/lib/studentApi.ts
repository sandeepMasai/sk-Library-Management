import { apiRaw } from './http';

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
