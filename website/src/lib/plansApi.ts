import { apiRaw } from './http';

export type PublicPlan = {
  _id?: string;
  key: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  finalPrice: number;
  originalPrice?: number | null;
  strikePrice?: number | null;
  savings?: number;
  duration: number;
  tag?: string | null;
  isTrial?: boolean;
  isOneTimeOffer?: boolean;
  campaignName?: string | null;
  promoDaysRemaining?: number | null;
  features?: string[];
  badges?: {
    recommended?: boolean;
    bestValue?: boolean;
    limitedTime?: boolean;
    exclusive?: boolean;
  };
  updatedAt?: string | null;
};

export type PublicPlansResponse = {
  plans: PublicPlan[];
  updatedAt?: string;
  count?: number;
};

export async function fetchPublicPlans(): Promise<PublicPlansResponse> {
  const res = await apiRaw<{ ok?: boolean } & PublicPlansResponse>('/api/plans/public');
  return {
    plans: Array.isArray(res.plans) ? res.plans : [],
    updatedAt: res.updatedAt,
    count: res.count,
  };
}
