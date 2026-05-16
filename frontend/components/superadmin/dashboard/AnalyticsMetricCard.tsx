import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { theme } from '../../../theme';
import { MiniSparkline } from './MiniSparkline';

type Props = {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: [string, string];
  growthPercent?: number;
  sparkValues?: number[];
  muted?: string;
  /** Parent-controlled width for responsive grids */
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
  containerStyle,
}: Props) {
  const trendUp = (growthPercent ?? 0) >= 0;
  const showTrend = growthPercent != null && Number.isFinite(growthPercent);

  return (
    <View style={[styles.card, containerStyle]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <View style={styles.top}>
          <View style={styles.iconWrap}>{icon}</View>
          {showTrend ? (
            <View style={[styles.trendPill, trendUp ? styles.trendUp : styles.trendDown, styles.trendShrink]}>
              {trendUp ? (
                <TrendingUp size={12} color={trendUp ? '#059669' : '#DC2626'} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={12} color="#DC2626" strokeWidth={2.5} />
              )}
              <Text style={[styles.trendTxt, { color: trendUp ? '#059669' : '#DC2626' }]}>
                {trendUp ? '+' : ''}
                {growthPercent}%
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {value}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {muted ? <Text style={styles.muted}>{muted}</Text> : null}
        {sparkValues && sparkValues.length > 1 ? (
          <View style={styles.spark}>
            <MiniSparkline values={sparkValues} stroke="rgba(255,255,255,0.92)" height={36} />
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    maxWidth: '100%',
    ...Platform.select({
      web: { boxShadow: '0 8px 28px rgba(79,70,229,0.18)' } as object,
      default: theme.shadow.card,
    }),
  },
  gradient: {
    padding: 16,
    minHeight: 128,
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
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    flexShrink: 1,
    maxWidth: '48%',
  },
  trendShrink: { marginLeft: 8 },
  trendUp: { backgroundColor: 'rgba(255,255,255,0.88)' },
  trendDown: { backgroundColor: 'rgba(255,255,255,0.88)' },
  trendTxt: { fontSize: 11, fontWeight: '900' },
  value: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  muted: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  spark: { marginTop: 10, width: '100%', overflow: 'hidden' },
});
