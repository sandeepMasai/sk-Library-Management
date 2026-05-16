import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { DonutChart, LineChart } from '../../ui/SimpleCharts';
import { theme } from '../../../theme';
import type { PaymentsOverview } from './types';

type Props = {
  overview: PaymentsOverview | null;
  loading: boolean;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  backgroundColor: string;
};

function Legend({ items }: { items: { color: string; label: string; value: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: it.color }]} />
          <Text style={styles.legendLbl}>{it.label}</Text>
          <Text style={styles.legendVal}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function PaymentChartsPanel({
  overview,
  loading,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
  backgroundColor,
}: Props) {
  const w = Dimensions.get('window').width;
  const chartW = Math.min(w - 80, 420);

  const sparkValues = useMemo(() => overview?.sparkline?.map((p) => p.revenue) || [], [overview]);
  const trendValues = useMemo(() => overview?.sparkline?.map((p) => p.revenue) || [], [overview]);
  const mix = overview?.subscriptionMix || { active: 0, expired: 0 };

  if (loading) {
    return (
      <View style={styles.grid}>
        {[1, 2, 3].map((k) => (
          <View key={k} style={[styles.panel, styles.skel, { borderColor }]} />
        ))}
      </View>
    );
  }

  if (!overview) return null;

  const donutValues = [mix.active, mix.expired];
  const donutColors = ['#22C55E', '#94A3B8'];

  return (
    <View style={styles.grid}>
      <View style={[styles.panel, { borderColor, backgroundColor: surfaceColor }]}>
        <Text style={[styles.overline, { color: mutedColor }]}>revenue</Text>
        <Text style={[styles.title, { color: textColor }]}>Revenue sparkline</Text>
        <LineChart width={chartW} height={120} values={sparkValues} stroke="#6366F1" fill="rgba(99,102,241,0.12)" />
        <Legend
          items={overview.sparkline.slice(-3).map((p) => ({
            color: '#6366F1',
            label: p.date,
            value: `₹${Math.round(p.revenue).toLocaleString('en-IN')}`,
          }))}
        />
      </View>

      <View style={[styles.panel, styles.panelCenter, { borderColor, backgroundColor: surfaceColor }]}>
        <Text style={[styles.overline, { color: mutedColor }]}>subscriptions</Text>
        <Text style={[styles.title, { color: textColor }]}>Active vs expired</Text>
        <DonutChart size={140} values={donutValues} colors={donutColors} trackColor={backgroundColor} />
        <Legend
          items={[
            { color: donutColors[0], label: 'Active', value: String(mix.active) },
            { color: donutColors[1], label: 'Expired', value: String(mix.expired) },
          ]}
        />
      </View>

      <View style={[styles.panel, { borderColor, backgroundColor: surfaceColor }]}>
        <Text style={[styles.overline, { color: mutedColor }]}>trend</Text>
        <Text style={[styles.title, { color: textColor }]}>Revenue trend (7d)</Text>
        <LineChart width={chartW} height={120} values={trendValues} stroke="#0EA5E9" fill="rgba(14,165,233,0.12)" />
        <Legend
          items={[
            { color: '#0EA5E9', label: '7-day total', value: `₹${Math.round(trendValues.reduce((a, b) => a + b, 0)).toLocaleString('en-IN')}` },
            {
              color: '#22C55E',
              label: 'MoM (same period)',
              value: `${overview.growthPercent >= 0 ? '+' : ''}${overview.growthPercent}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  panel: {
    flex: 1,
    minWidth: 280,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  panelCenter: { alignItems: 'center' },
  skel: { height: 200, opacity: 0.35, backgroundColor: theme.colors.border },
  overline: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '900', marginTop: 4, marginBottom: 12 },
  legend: { marginTop: 12, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLbl: { flex: 1, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText },
  legendVal: { fontSize: 12, fontWeight: '900', color: theme.colors.text },
});
