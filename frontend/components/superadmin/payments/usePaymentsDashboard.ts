import { useCallback, useEffect, useState } from 'react';
import { apiGet, type ApiError } from '../../../services/api';
import type { PaymentFilters, PaymentRow, PaymentsOverview, PaymentsTotals } from './types';
import { DEFAULT_PAYMENT_FILTERS, isPaymentWithLibrary } from './types';

export function usePaymentsDashboard(enabled: boolean) {
  const [filters, setFilters] = useState<PaymentFilters>(DEFAULT_PAYMENT_FILTERS);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overview, setOverview] = useState<PaymentsOverview | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<PaymentsTotals | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await apiGet<{ ok: boolean; overview: PaymentsOverview }>('/api/superadmin/payments/overview');
      setOverview(res.overview || null);
    } catch (e: unknown) {
      const err = e as ApiError;
      setOverviewError(err?.message || 'Failed to load payment analytics');
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.paymentStatus !== 'all') params.paymentStatus = filters.paymentStatus;
      if (filters.planType !== 'all') params.planType = filters.planType;
      if (filters.libraryStatus !== 'all') params.libraryStatus = filters.libraryStatus;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const res = await apiGet<{
        ok: boolean;
        payments: PaymentRow[];
        total: number;
        totals: PaymentsTotals;
      }>('/api/superadmin/payments', params);

      const payments = (res.payments || []).filter(isPaymentWithLibrary);

      setRows(payments);
      setTotal(Number(res.total || 0));
      setTotals(res.totals || null);
    } catch (e: unknown) {
      const err = e as ApiError;
      setListError(err?.message || 'Failed to load payments');
      setRows([]);
      setTotals(null);
    } finally {
      setListLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    if (!enabled) return;
    loadOverview();
  }, [enabled, loadOverview]);

  useEffect(() => {
    if (!enabled) return;
    const delay = filters.search.trim() ? 350 : 0;
    const t = setTimeout(() => loadList(), delay);
    return () => clearTimeout(t);
  }, [enabled, loadList]);

  const refresh = useCallback(() => {
    loadOverview();
    loadList();
  }, [loadOverview, loadList]);

  const updateFilters = useCallback((patch: Partial<PaymentFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const applyFilters = useCallback((next: PaymentFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const clearModalFilters = useCallback(() => {
    setFilters((f) => ({ ...DEFAULT_PAYMENT_FILTERS, search: f.search }));
    setPage(1);
  }, []);

  return {
    filters,
    updateFilters,
    applyFilters,
    clearModalFilters,
    page,
    setPage,
    limit,
    total,
    rows,
    totals,
    overview,
    overviewLoading,
    overviewError,
    listLoading,
    listError,
    refresh,
    loadOverview,
    loadList,
  };
}
