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
  studentCount?: number;
  planName?: string;
  city?: string;
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
}): Promise<{ libraries: SuperAdminLibrary[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  q.set('includeCounts', '1');
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search?.trim()) q.set('search', params.search.trim());
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

export async function fetchRecentLibraries(limit = 8): Promise<SuperAdminLibrary[]> {
  const res = await apiRaw<{ ok?: boolean; libraries?: SuperAdminLibrary[] }>(
    `/api/superadmin/recent-libraries?limit=${limit}`
  );
  return res.libraries ?? [];
}
