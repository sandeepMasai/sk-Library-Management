import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, ScrollView } from 'react-native';
import { IndianRupee, RefreshCw } from 'lucide-react-native';
import { theme } from '../../../theme';
import { DashboardWidgetSkeleton } from './DashboardWidgetSkeleton';
import { LineChart, BarChart } from '../../ui/SimpleCharts';
import type { RevenueOverview } from './types';

type Props = {
  overview: RevenueOverview | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  backgroundColor: string;
  compact?: boolean;
};

function fmtINR(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function RevenueOverviewWidget({
  overview,
  loading,
  error,
  onRetry,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
  backgroundColor,
  compact = false,
}: Props) {
  const windowW = Dimensions.get('window').width;
  const chartWidth = Math.min(windowW - theme.spacing.lg * 2 - 48, compact ? windowW - 80 : 480);
  const sparkValues = useMemo(() => overview?.sparkline?.map((p) => p.revenue) || [], [overview]);
  const monthValues = useMemo(() => overview?.monthlyTrend?.map((p) => p.revenue) || [], [overview]);

  const metrics = overview
    ? [
        { label: 'Total revenue', value: fmtINR(overview.totalRevenue) },
        { label: 'This month', value: fmtINR(overview.monthlyRevenue) },
        { label: 'Today', value: fmtINR(overview.todayRevenue) },
        { label: 'Active subs', value: String(overview.activeSubscriptions) },
        { label: 'Pending renewals', value: String(overview.pendingRenewals) },
      ]
    : [];

  return (
    <View style={[styles.panel, { borderColor, backgroundColor: surfaceColor }]}>
      <View style={[styles.head, compact && styles.headCompact]}>
        <View style={styles.headTitle}>
          <Text style={[styles.overline, { color: mutedColor }]}>Subscriptions</Text>
          <Text style={[styles.title, { color: textColor }]}>Payment revenue</Text>
        </View>
        {overview && overview.growthPercent != null ? (
          <View
            style={[
              styles.growth,
              overview.growthPercent >= 0 ? styles.growthUp : styles.growthDown,
              compact && styles.growthCompact,
            ]}
          >
            <Text
              style={[
                styles.growthTxt,
                { color: overview.growthPercent >= 0 ? theme.colors.success : theme.colors.danger },
              ]}
            >
              {overview.growthPercent >= 0 ? '+' : ''}
              {overview.growthPercent}% vs last month (same days)
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <DashboardWidgetSkeleton lines={4} height={120} />
      ) : error ? (
        <View style={styles.err}>
          <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{error}</Text>
          <TouchableOpacity onPress={onRetry} style={[styles.retryBtn, { borderColor }]}>
            <RefreshCw size={14} color={textColor} />
            <Text style={{ color: textColor, fontWeight: '800', marginLeft: 6 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !overview ? (
        <Text style={[styles.empty, { color: mutedColor }]}>No revenue data.</Text>
      ) : (
        <>
          <View style={styles.metricGrid}>
            {metrics.map((m) => (
              <View key={m.label} style={[styles.metricCell, { borderColor, backgroundColor }]}>
                <IndianRupee size={12} color={theme.colors.primary} style={{ marginBottom: 4 }} />
                <Text style={[styles.metricVal, { color: textColor }]}>{m.value}</Text>
                <Text style={[styles.metricLbl, { color: mutedColor }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
            <View style={[styles.chartBox, { borderColor, backgroundColor, width: chartWidth + 24 }]}>
              <Text style={[styles.chartLbl, { color: mutedColor }]}>7-day revenue</Text>
              <LineChart
                width={chartWidth}
                height={120}
                values={sparkValues.length ? sparkValues : [0]}
                stroke={theme.colors.primary}
              />
            </View>
          </ScrollView>

          {monthValues.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chartScroll, { marginTop: 12 }]}>
              <View style={[styles.chartBox, { borderColor, backgroundColor, width: chartWidth + 24 }]}>
                <Text style={[styles.chartLbl, { color: mutedColor }]}>Monthly trend</Text>
                <BarChart
                  width={chartWidth}
                  height={100}
                  values={monthValues}
                  colors={[theme.colors.primary, theme.colors.success, theme.colors.warning].concat(
                    Array(Math.max(0, monthValues.length - 3)).fill(theme.colors.primary)
                  )}
                />
              </View>
            </ScrollView>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.md,
    ...theme.shadow.card,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      } as object,
    }),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  headCompact: {
    flexWrap: 'wrap',
  },
  headTitle: { flex: 1, minWidth: 0 },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  growth: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  growthUp: { backgroundColor: 'rgba(5,150,105,0.12)' },
  growthDown: { backgroundColor: 'rgba(220,38,38,0.1)' },
  growthCompact: { alignSelf: 'flex-start' },
  chartScroll: { marginHorizontal: -4 },
  growthTxt: { fontSize: 11, fontWeight: '900' },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metricCell: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 120,
    maxWidth: '100%',
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  metricVal: { fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  metricLbl: { marginTop: 4, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  chartBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.sm,
  },
  chartLbl: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  err: { paddingVertical: 16, gap: 12 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  empty: { fontStyle: 'italic', paddingVertical: 20 },
});
