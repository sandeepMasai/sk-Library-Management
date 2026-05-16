import type { PlanTypeFilter } from '../../../components/superadmin/filters';

export type LibrariesStackParamList = {
  LibrariesHub: undefined;
  LibrariesFiltered: {
    planType: PlanTypeFilter;
    search?: string;
  };
};

export const PLAN_FILTER_SCREEN_TITLES: Record<PlanTypeFilter, string> = {
  all: 'All libraries',
  free: 'Free libraries',
  pro: 'Pro libraries',
  trial: 'Trial libraries',
  none: 'None plan libraries',
};
