import { apiRaw } from '../../lib/http';

export type SuperAdminStats = {
  totalLibraries: number;
  activeLibraries: number;
  totalStudents: number;
  revenue: number;
};

export type SuperAdminLibrary = {
  id: string;
  name: string;
  ownerName?: string;
  email?: string;
  plan?: string;
  currentPlanKey?: string;
  subscriptionStatus?: string;
  status?: string;
  isActive?: boolean;
  libraryCode?: string;
  planExpiryDate?: string | null;
  createdAt?: string | null;
  joinedAt?: string | null;
  studentCount?: number;
  planName?: string;
  city?: string;
  state?: string;
};

export type PlanBadges = {
  recommended?: boolean;
  bestValue?: boolean;
  limitedTime?: boolean;
  exclusive?: boolean;
};

export type PlanRow = {
  _id: string;
  name: string;
  key: string;
  price: number;
  discount: number;
  finalPrice: number;
  originalPrice?: number | null;
  strikePrice?: number | null;
  savings?: number;
  duration: number;
  isActive: boolean;
  tag?: string | null;
  isPublic?: boolean;
  isOneTimeOffer?: boolean;
  isTrial?: boolean;
  allowedLibraryIds?: string[];
  planType?: string;
  planTypeLabel?: string;
  librariesLabel?: string;
  description?: string;
  campaignName?: string | null;
  promoStartDate?: string | null;
  promoEndDate?: string | null;
  badges?: PlanBadges;
  analytics?: {
    views: number;
    purchases: number;
    conversionRate: number;
    revenue: number;
  };
};

export type PlanManagementOverview = {
  totalLibraries: number;
  activeSubscribers: number;
  monthlyRevenue: number;
  expiringPlans: number;
  expiredPlans?: number;
  cancelledPlans?: number;
};

export type SparklinePoint = { date: string; value: number };

export type PlatformTrends = {
  newLibraries: { total7d: number; sparkline: SparklinePoint[]; growthPercent: number };
  subscriptionGrowth: { total7d: number; sparkline: SparklinePoint[]; growthPercent: number };
  expiryTrend: { total7d: number; sparkline: SparklinePoint[] };
};

export type PlanDistributionSegment = {
  key: string;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type PlanDistribution = {
  total: number;
  segments: PlanDistributionSegment[];
};

export type RevenueOverview = {
  totalRevenue: number;
  monthlyRevenue: number;
  todayRevenue: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  pendingRenewals: number;
  growthPercent: number;
  sparkline: Array<{ date: string; revenue: number }>;
  monthlyTrend: Array<{ month: string; revenue: number }>;
};

export type SuperAdminActivity = {
  id: string;
  type: string;
  action: string;
  title: string;
  description: string;
  libraryId?: string | null;
  libraryName?: string | null;
  role?: string | null;
  timestamp?: string | null;
};

export type PlanAuditLog = {
  id: string;
  action: string;
  adminName?: string;
  libraryName?: string | null;
  planName?: string | null;
  timestamp?: string | null;
  ip?: string | null;
};

export type PlanAnalytics = {
  planId: string;
  planKey: string;
  planName: string;
  views: number;
  purchases: number;
  conversionRate: number;
  revenue: number;
};

export type LibraryDetail = {
  id: string;
  name: string;
  libraryCode: string;
  ownerName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string;
  isActive: boolean;
  plan: string;
  planStartDate: string | null;
  planExpiryDate: string | null;
  subscriptionStatus: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelNote: string | null;
  createdAt: string | null;
};

export type LibraryStats = {
  totalSeats: number;
  totalStudents: number;
  activeStudents: number;
  revenue: number;
};

export type LibrarySubscriptionDetail = {
  libraryName: string;
  libraryCode: string;
  isActive: boolean;
  libraryPlan: string;
  owner: { name: string; phone: string | null; email: string };
  subscription: {
    plan: string;
    price: number;
    startDate: string | null;
    expiryDate: string | null;
    status: 'active' | 'expired' | 'cancelled';
    paymentStatus: string;
  };
  stats: LibraryStats;
  payments: Array<{
    id: string;
    plan: string;
    amount: number;
    currency: string;
    status: string;
    orderId: string;
    paymentId: string;
    date: string | null;
  }>;
};

export type PlanPayload = {
  name: string;
  key: string;
  price: number;
  discount: number;
  duration: number;
  isActive: boolean;
  tag: string | null;
  originalPrice: number | null;
  isPublic: boolean;
  isOneTimeOffer: boolean;
  isTrial?: boolean;
  allowedLibraryIds: string[];
  description?: string;
  campaignName?: string | null;
  promoStartDate?: string | null;
  promoEndDate?: string | null;
  badges?: PlanBadges;
};

export async function fetchSuperAdminDashboard(): Promise<SuperAdminStats> {
  const res = await apiRaw<{ ok?: boolean; stats?: SuperAdminStats }>('/api/admin/dashboard');
  if (!res.stats) throw new Error('Invalid dashboard response');
  return res.stats;
}

export async function fetchSuperAdminLibraries(params?: {
  page?: number;
  limit?: number;
  search?: string;
  planKey?: 'all' | 'pro' | 'free' | 'trial';
  status?: 'all' | 'active' | 'inactive';
  sort?: 'name_asc' | 'name_desc' | 'created_desc';
}): Promise<{ libraries: SuperAdminLibrary[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  q.set('includeCounts', '1');
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search?.trim()) q.set('search', params.search.trim());
  if (params?.planKey && params.planKey !== 'all') q.set('planKey', params.planKey);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  q.set('sort', params?.sort || 'name_asc');
  const res = await apiRaw<{
    ok?: boolean;
    libraries?: SuperAdminLibrary[];
    total?: number;
    page?: number;
    limit?: number;
  }>(`/api/admin/libraries?${q}`);
  return {
    libraries: res.libraries ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    limit: res.limit ?? 20,
  };
}

export async function fetchSubscriptionOverview(): Promise<{
  active: number;
  expiringSoon: number;
  expired: number;
  cancelled: number;
}> {
  const res = await apiRaw<{
    ok?: boolean;
    overview?: { active: number; expiringSoon: number; expired: number; cancelled: number };
  }>('/api/superadmin/subscription-overview');
  return (
    res.overview ?? {
      active: 0,
      expiringSoon: 0,
      expired: 0,
      cancelled: 0,
    }
  );
}

export async function fetchPlanManagementOverview(): Promise<PlanManagementOverview> {
  const res = await apiRaw<{ ok?: boolean; overview?: PlanManagementOverview }>(
    '/api/superadmin/plan-management-overview'
  );
  return (
    res.overview ?? {
      totalLibraries: 0,
      activeSubscribers: 0,
      monthlyRevenue: 0,
      expiringPlans: 0,
    }
  );
}

export async function fetchRevenueOverview(): Promise<RevenueOverview> {
  const res = await apiRaw<{ ok?: boolean; overview?: RevenueOverview }>('/api/superadmin/revenue-overview');
  return (
    res.overview ?? {
      totalRevenue: 0,
      monthlyRevenue: 0,
      todayRevenue: 0,
      activeSubscriptions: 0,
      cancelledSubscriptions: 0,
      pendingRenewals: 0,
      growthPercent: 0,
      sparkline: [],
      monthlyTrend: [],
    }
  );
}

export async function fetchRecentActivity(limit = 20): Promise<SuperAdminActivity[]> {
  const res = await apiRaw<{ ok?: boolean; activities?: SuperAdminActivity[] }>(
    `/api/superadmin/recent-activity?limit=${limit}`
  );
  return res.activities ?? [];
}

export async function fetchPlatformTrends(): Promise<PlatformTrends> {
  const res = await apiRaw<{ ok?: boolean; trends?: PlatformTrends }>('/api/superadmin/platform-trends');
  return (
    res.trends ?? {
      newLibraries: { total7d: 0, sparkline: [], growthPercent: 0 },
      subscriptionGrowth: { total7d: 0, sparkline: [], growthPercent: 0 },
      expiryTrend: { total7d: 0, sparkline: [] },
    }
  );
}

export async function fetchPlanDistribution(): Promise<PlanDistribution> {
  const res = await apiRaw<{ ok?: boolean; distribution?: PlanDistribution }>(
    '/api/superadmin/plan-distribution'
  );
  return res.distribution ?? { total: 0, segments: [] };
}

export async function fetchPlans(): Promise<PlanRow[]> {
  const res = await apiRaw<{ ok?: boolean; plans?: PlanRow[] }>('/api/plans?all=1&enriched=1');
  return res.plans ?? [];
}

export async function createPlan(payload: PlanPayload): Promise<PlanRow> {
  const res = await apiRaw<{ ok?: boolean; plan?: PlanRow; message?: string }>('/api/plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.plan) throw new Error(res.message || 'Failed to create plan');
  return res.plan;
}

export async function updatePlan(id: string, payload: Partial<PlanPayload>): Promise<PlanRow> {
  const res = await apiRaw<{ ok?: boolean; plan?: PlanRow; message?: string }>(`/api/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.plan) throw new Error(res.message || 'Failed to update plan');
  return res.plan;
}

export async function deletePlan(id: string): Promise<void> {
  await apiRaw(`/api/plans/${id}`, { method: 'DELETE' });
}

export async function clonePlan(id: string): Promise<PlanRow> {
  const res = await apiRaw<{ ok?: boolean; plan?: PlanRow; message?: string }>(`/api/plans/${id}/clone`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.plan) throw new Error(res.message || 'Failed to clone plan');
  return res.plan;
}

export async function fetchPlanAnalytics(id: string): Promise<PlanAnalytics> {
  const res = await apiRaw<{ ok?: boolean; analytics?: PlanAnalytics; message?: string }>(
    `/api/plans/${id}/analytics`
  );
  if (!res.analytics) throw new Error(res.message || 'Failed to load analytics');
  return res.analytics;
}

export async function fetchPlanAuditLogs(limit = 20): Promise<PlanAuditLog[]> {
  const res = await apiRaw<{ ok?: boolean; logs?: PlanAuditLog[] }>(`/api/plans/audit-logs?limit=${limit}`);
  return res.logs ?? [];
}

export async function fetchLibraryDetail(id: string): Promise<{ library: LibraryDetail; stats: LibraryStats }> {
  const res = await apiRaw<{ ok?: boolean; library?: LibraryDetail; stats?: LibraryStats; message?: string }>(
    `/api/admin/library/${id}`
  );
  if (!res.library || !res.stats) throw new Error(res.message || 'Failed to load library');
  return { library: res.library, stats: res.stats };
}

export async function fetchLibrarySubscription(id: string): Promise<LibrarySubscriptionDetail> {
  const res = await apiRaw<{ ok?: boolean; message?: string } & LibrarySubscriptionDetail>(
    `/api/admin/library/${id}/subscription`
  );
  if (!res.ok) throw new Error(res.message || 'Failed to load subscription');
  return res as LibrarySubscriptionDetail;
}

export async function assignLibraryPlan(
  libraryId: string,
  body: { planId?: string; planKey?: string; previousPlanKey?: string }
): Promise<void> {
  await apiRaw(`/api/admin/library/${libraryId}/assign-plan`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function extendLibraryPlan(libraryId: string, extraDays: number): Promise<void> {
  await apiRaw(`/api/admin/library/${libraryId}/extend-plan`, {
    method: 'POST',
    body: JSON.stringify({ extraDays }),
  });
}

export async function cancelLibrarySubscription(libraryId: string): Promise<void> {
  await apiRaw('/api/admin/subscription/cancel', {
    method: 'POST',
    body: JSON.stringify({ libraryId }),
  });
}

export async function fetchRecentLibraries(limit = 8): Promise<SuperAdminLibrary[]> {
  const res = await apiRaw<{ ok?: boolean; libraries?: SuperAdminLibrary[] }>(
    `/api/superadmin/recent-libraries?limit=${limit}`
  );
  return res.libraries ?? [];
}

export type SuperAdminNotification = {
  id: string;
  title: string;
  message: string;
  target: string;
  createdAt?: string | null;
  count?: number;
};

export async function fetchSuperAdminNotifications(limit = 30): Promise<SuperAdminNotification[]> {
  const res = await apiRaw<{ ok?: boolean; notifications?: SuperAdminNotification[] }>(
    `/api/admin/notifications?limit=${limit}`
  );
  return res.notifications ?? [];
}

export async function sendSuperAdminNotification(body: {
  title: string;
  message: string;
  target?: string;
}): Promise<{ created: number }> {
  const res = await apiRaw<{ ok?: boolean; created?: number; message?: string }>('/api/admin/notify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.message || 'Failed to send notification');
  return { created: res.created ?? 0 };
}

export async function updateSuperAdminNotification(
  id: string,
  body: { title: string; message: string }
): Promise<void> {
  await apiRaw(`/api/admin/notifications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteSuperAdminNotification(id: string): Promise<void> {
  await apiRaw(`/api/admin/notifications/${id}`, { method: 'DELETE' });
}
