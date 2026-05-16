import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
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

export function PaymentChartsPanel({
  overview,
  loading,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
}: Props) {
  const w = Dimensions.get('window').width;
  const chartH = 160;

  const sparkData = useMemo(
    () => (overview?.sparkline || []).map((p) => ({ name: p.date.slice(5), revenue: p.revenue })),
    [overview]
  );

  const donutData = useMemo(() => {
    const mix = overview?.subscriptionMix || { active: 0, expired: 0 };
    return [
      { name: 'Active', value: mix.active, color: '#22C55E' },
      { name: 'Expired', value: mix.expired, color: '#94A3B8' },
    ];
  }, [overview]);

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

  return (
    <View style={styles.grid}>
      <View style={[styles.panel, { borderColor, backgroundColor: surfaceColor }]}>
        <Text style={[styles.overline, { color: mutedColor }]}>revenue</Text>
        <Text style={[styles.title, { color: textColor }]}>Revenue sparkline</Text>
        <View style={{ height: chartH, width: '100%', maxWidth: w - 120 }}>
          <ResponsiveContainer width="100%" height={chartH}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="paySpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#6366F1" fill="url(#paySpark)" strokeWidth={2} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </View>
      </View>

      <View style={[styles.panel, { borderColor, backgroundColor: surfaceColor }]}>
        <Text style={[styles.overline, { color: mutedColor }]}>subscriptions</Text>
        <Text style={[styles.title, { color: textColor }]}>Active vs expired</Text>
        <View style={{ height: chartH, width: '100%' }}>
          <ResponsiveContainer width="100%" height={chartH}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} isAnimationActive>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </View>
      </View>

      <View style={[styles.panel, { borderColor, backgroundColor: surfaceColor }]}>
        <Text style={[styles.overline, { color: mutedColor }]}>trend</Text>
        <Text style={[styles.title, { color: textColor }]}>Revenue trend (7d)</Text>
        <View style={{ height: chartH, width: '100%' }}>
          <ResponsiveContainer width="100%" height={chartH}>
            <LineChart data={sparkData}>
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#0EA5E9" strokeWidth={2.5} dot={false} isAnimationActive />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </View>
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
  skel: { height: 200, opacity: 0.35, backgroundColor: theme.colors.border },
  overline: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '900', marginTop: 4, marginBottom: 12 },
});
