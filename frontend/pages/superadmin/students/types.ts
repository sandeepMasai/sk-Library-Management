export type LibraryWithStudentStats = {
  id: string;
  name: string;
  ownerName: string;
  city: string;
  state: string;
  planName: string;
  status: 'active' | 'inactive';
  isActive: boolean;
  totalStudents: number;
  activeStudents: number;
  expiredStudents: number;
  revenue: number;
};

export type LibraryStudentRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  seatNumber: string | null;
  timing: string | null;
  planDurationDays: number | null;
  fees: number;
  feeStatus: string;
  joinDate: string | null;
  expiryDate: string | null;
  isActive: boolean;
  isBlocked: boolean;
  membershipStatus: string;
  attendancePercent: number;
};

export type StudentDetail = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  libraryName: string;
  libraryId: string | null;
  seatNumber: string | null;
  timing: string | null;
  address: string | null;
  attendancePercent: number;
  attendancePresentDays: number;
  joinDate: string | null;
  expiryDate: string | null;
  planDurationDays: number | null;
  fees: number;
  feeStatus: string;
  feeMethod: string;
  isActive: boolean;
  isBlocked: boolean;
  membershipStatus: string;
  notes: string | null;
  paymentHistory: {
    id: string;
    date: string | null;
    amount: number;
    status: string;
    method: string;
    label: string;
  }[];
};

export type StudentsStackParamList = {
  StudentsLibraryList: undefined;
  LibraryStudents: { libraryId: string; libraryName: string };
  StudentDetail: { studentId: string };
};
