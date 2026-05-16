import React from 'react';
import { FilterSearchBar } from '../filters';
import type { PaymentFilters } from './types';
import type { PaymentStatusFilter, PlanTypeFilter } from '../filters/types';

type Props = {
  filters: PaymentFilters;
  onChange: (patch: Partial<PaymentFilters>) => void;
  onReset: () => void;
  filterLoading?: boolean;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
};

export function PaymentFiltersBar({
  filters,
  onChange,
  onReset,
  filterLoading = false,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
}: Props) {
  return (
    <FilterSearchBar
      values={{
        search: filters.search,
        planType: filters.planType,
        paymentStatus: filters.paymentStatus,
      }}
      onSearchChange={(search) => onChange({ search })}
      onPlanTypeChange={(planType: PlanTypeFilter) => onChange({ planType })}
      onPaymentStatusChange={(paymentStatus: PaymentStatusFilter) => onChange({ paymentStatus })}
      onReset={onReset}
      filterLoading={filterLoading}
      showPaymentStatus
      searchPlaceholder="Search library, owner, email, transaction ID…"
      borderColor={borderColor}
      surfaceColor={surfaceColor}
      textColor={textColor}
      mutedColor={mutedColor}
    />
  );
}
