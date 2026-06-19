import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Calendar, CheckCircle2, Clock, IndianRupee, TrendingUp, XCircle } from 'lucide-react-native';
import { AnalyticsMetricCard } from '../dashboard/AnalyticsMetricCard';
import type { PaymentsOverview } from './types';
import { theme } from '../../../theme';

type Props = {
  overview: PaymentsOverview | null;
  loading: boolean;
};

function fmtINR(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

const KPI_CONFIG = [
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    gradient: ['#4F46E5', '#7C3AED'] as [string, string],
    iconColor: '#E0E7FF',
    Icon: IndianRupee,
    getValue: (o: PaymentsOverview) => fmtINR(o.totalRevenue),
    getGrowth: (o: PaymentsOverview) => o.growthPercent,
    spark: (o: PaymentsOverview) => o.sparkline.map((p) => p.revenue),
  },
  {
    key: 'monthlyRevenue',
    label: 'Monthly Revenue',
    gradient: ['#0EA5E9', '#2563EB'] as [string, string],
    iconColor: '#E0F2FE',
    Icon: TrendingUp,
    getValue: (o: PaymentsOverview) => fmtINR(o.monthlyRevenue),
    getGrowth: (o: PaymentsOverview) => o.growthPercent,
    spark: (o: PaymentsOverview) => o.sparkline.map((p) => p.revenue),
  },
  {
    key: 'todayRevenue',
    label: 'Today Revenue',
    gradient: ['#10B981', '#059669'] as [string, string],
    iconColor: '#D1FAE5',
    Icon: Calendar,
    getValue: (o: PaymentsOverview) => fmtINR(o.todayRevenue),
    getGrowth: () => undefined,
    spark: (o: PaymentsOverview) => o.sparkline.map((p) => p.revenue),
  },
  {
    key: 'pending',
    label: 'Pending Payments',
    gradient: ['#F59E0B', '#D97706'] as [string, string],
    iconColor: '#FEF3C7',
    Icon: Clock,
    getValue: (o: PaymentsOverview) => String(o.pendingPayments),
    getGrowth: () => undefined,
    spark: (o: PaymentsOverview) => [2, 4, 3, 5, o.pendingPayments, 4, 6],
  },
  {
    key: 'failed',
    label: 'Failed Payments',
    gradient: ['#EF4444', '#DC2626'] as [string, string],
    iconColor: '#FEE2E2',
    Icon: XCircle,
    getValue: (o: PaymentsOverview) => String(o.failedPayments),
    getGrowth: () => undefined,
    spark: () => [1, 2, 1, 3, 2, 1, 2],
  },
  {
    key: 'activeSubs',
    label: 'Active Subscriptions',
    gradient: ['#8B5CF6', '#6D28D9'] as [string, string],
    iconColor: '#EDE9FE',
    Icon: CheckCircle2,
    getValue: (o: PaymentsOverview) => String(o.activeSubscriptions),
    getGrowth: () => undefined,
    spark: (o: PaymentsOverview) => {
      const { active, expired } = o.subscriptionMix;
      const t = active + expired || 1;
      return [active / t, expired / t].concat([active, active, expired, active]).map((v) => v * 100);
    },
  },
] as const;

export function PaymentKpiGrid({ overview, loading }: Props) {
  const { width } = useWindowDimensions();
  const cols = width >= 1200 ? 3 : width >= 720 ? 2 : 1;
  const cardBasis = cols === 3 ? '32%' : cols === 2 ? '48.5%' : '100%';

  if (loading || !overview) {
    return (
      <View style={styles.grid}>
        {KPI_CONFIG.map((c) => (
          <View key={c.key} style={[styles.skeleton, { width: cardBasis }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {KPI_CONFIG.map((cfg) => {
        const Icon = cfg.key === 'pending' ? Clock : cfg.key === 'failed' ? XCircle : cfg.Icon;
        const spark =
          cfg.key === 'pending'
            ? [2, 4, 3, 5, overview.pendingPayments, 4, 6]
            : cfg.key === 'failed'
              ? [1, 2, overview.failedPayments, 3, 2, 1, 2]
              : cfg.spark(overview);

        return (
          <AnalyticsMetricCard
            key={cfg.key}
            label={cfg.label}
            value={cfg.getValue(overview)}
            gradient={cfg.gradient}
            growthPercent={cfg.getGrowth(overview)}
            sparkValues={spark}
            icon={<Icon size={20} color={cfg.gradient[0]} strokeWidth={2.2} />}
            containerStyle={{ width: cardBasis, marginBottom: 12 }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
  },
  skeleton: {
    height: 128,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
    opacity: 0.35,
    marginBottom: 12,
  },
});
