import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { theme } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';
import { MiniSparkline } from './MiniSparkline';

type Props = {
  label: string;
  value: string;
  icon: React.ReactNode;
  /** Used as accent tint for flat cards */
  gradient: [string, string];
  growthPercent?: number;
  sparkValues?: number[];
  muted?: string;
  trendLabel?: string;
  containerStyle?: object;
};

export function AnalyticsMetricCard({
  label,
  value,
  icon,
  gradient,
  growthPercent,
  sparkValues,
  muted,
  trendLabel,
  containerStyle,
}: Props) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const accent = gradient[0];
  const trendUp = (growthPercent ?? 0) >= 0;
  const showTrend = growthPercent != null && Number.isFinite(growthPercent);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
        containerStyle,
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: accent + (isDark ? '28' : '14') }]}>{icon}</View>
        {showTrend ? (
          <View
            style={[
              styles.trendPill,
              {
                backgroundColor: trendUp
                  ? isDark
                    ? 'rgba(16,185,129,0.14)'
                    : 'rgba(16,185,129,0.1)'
                  : isDark
                    ? 'rgba(239,68,68,0.14)'
                    : 'rgba(239,68,68,0.1)',
              },
            ]}
          >
            {trendUp ? (
              <TrendingUp size={11} color={trendUp ? '#059669' : '#DC2626'} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={11} color="#DC2626" strokeWidth={2.5} />
            )}
            <Text style={[styles.trendTxt, { color: trendUp ? '#059669' : '#DC2626' }]}>
              {trendUp ? '+' : ''}
              {growthPercent}%
            </Text>
          </View>
        ) : trendLabel ? (
          <Text style={[styles.trendHint, { color: theme.colors.mutedText }]}>{trendLabel}</Text>
        ) : null}
      </View>

      <Text style={[styles.value, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      <Text style={[styles.label, { color: theme.colors.mutedText }]} numberOfLines={1}>
        {label}
      </Text>
      {muted ? <Text style={[styles.muted, { color: theme.colors.mutedText }]} numberOfLines={1}>{muted}</Text> : null}

      {sparkValues && sparkValues.length > 1 ? (
        <View style={styles.spark}>
          <MiniSparkline values={sparkValues} stroke={accent} height={32} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 118,
    maxWidth: '100%',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)' } as object,
      default: theme.shadow.card,
    }),
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    flexShrink: 1,
    maxWidth: '52%',
  },
  trendTxt: { fontSize: 10, fontWeight: '900' },
  trendHint: { fontSize: 10, fontWeight: '700' },
  value: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  muted: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  spark: { marginTop: 10, width: '100%', overflow: 'hidden' },
});
