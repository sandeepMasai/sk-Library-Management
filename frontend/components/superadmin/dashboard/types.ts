export type RecentLibraryRow = {
  id: string;
  name: string;
  ownerName: string;
  city: string;
  state: string;
  planName: string;
  joinedAt: string | null;
  status: 'active' | 'inactive';
  isActive: boolean;
};

export type ActivityType =
  | 'registration'
  | 'payment'
  | 'plan_upgrade'
  | 'student'
  | 'expiry'
  | 'login'
  | 'other';

export type RecentActivityRow = {
  id: string;
  type: ActivityType;
  action: string;
  title: string;
  description: string;
  libraryId: string | null;
  libraryName: string | null;
  role: string | null;
  timestamp: string | null;
};

export type RevenueOverview = {
  totalRevenue: number;
  monthlyRevenue: number;
  todayRevenue: number;
  activeSubscriptions: number;
  pendingRenewals: number;
  growthPercent: number;
  sparkline: { date: string; revenue: number }[];
  monthlyTrend: { month: string; revenue: number }[];
};

export type DashboardInsightSection = 'new-libraries' | 'recent-activity' | 'revenue-overview';
