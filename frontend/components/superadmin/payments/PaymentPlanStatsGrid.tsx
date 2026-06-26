import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { PLAN_FILTER_CARDS } from '../filters/planFilterConfig';
import type { PlanTypeFilter } from '../filters/types';
import type { PlanLibraryCounts } from './usePlanLibraryStats';
import { theme } from '../../../theme';

type Props = {
  counts: PlanLibraryCounts;
  loading: boolean;
  error: string | null;
  selected: PlanTypeFilter;
  onSelect: (plan: PlanTypeFilter) => void;
  onRetry?: () => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
};

const ALL_CFG = {
  key: 'all' as const,
  label: 'ALL',
  accent: '#6366F1',
  bg: 'rgba(99,102,241,0.12)',
  border: 'rgba(99,102,241,0.35)',
};

const PLAN_META: Record<Exclude<PlanTypeFilter, 'all'>, { accent: string; bg: string; border: string }> = {
  free: { accent: '#64748B', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.35)' },
  pro: { accent: '#6366F1', bg: 'rgba(99,102,241,0.14)', border: 'rgba(129,140,248,0.4)' },
  trial: { accent: '#D97706', bg: 'rgba(245,158,11,0.14)', border: 'rgba(251,191,36,0.4)' },
  none: { accent: '#DC2626', bg: 'rgba(239,68,68,0.12)', border: 'rgba(248,113,113,0.35)' },
};

export function PaymentPlanStatsGrid({
  counts,
  loading,
  error,
  selected,
  onSelect,
  onRetry,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
}: Props) {
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 5 : width >= 560 ? 3 : 2;
  const cardBasis = cols === 5 ? '18.5%' : cols === 3 ? '31%' : '48%';

  const styles = useMemo(
    () => makeStyles(borderColor, surfaceColor, textColor, mutedColor, cardBasis),
    [borderColor, surfaceColor, textColor, mutedColor, cardBasis]
  );

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View>
          <Text style={styles.overline}>LIBRARY PLANS</Text>
          <Text style={styles.title}>Payment stats by plan</Text>
        </View>
        {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      </View>

      {error ? (
        <TouchableOpacity onPress={onRetry} style={styles.errorBanner}>
          <Text style={styles.errorTxt}>{error}</Text>
          <Text style={styles.retryTxt}>Tap to retry</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.grid}>
        <PlanStatChip
          label={ALL_CFG.label}
          count={counts.all}
          active={selected === 'all'}
          accent={ALL_CFG.accent}
          activeBg={ALL_CFG.bg}
          activeBorder={ALL_CFG.border}
          onPress={() => onSelect('all')}
          styles={styles}
          loading={loading}
        />
        {PLAN_FILTER_CARDS.map((cfg) => {
          const meta = PLAN_META[cfg.key];
          return (
            <PlanStatChip
              key={cfg.key}
              label={cfg.label}
              count={counts[cfg.key]}
              active={selected === cfg.key}
              accent={meta.accent}
              activeBg={meta.bg}
              activeBorder={meta.border}
              onPress={() => onSelect(cfg.key)}
              styles={styles}
              loading={loading}
            />
          );
        })}
      </View>

      <Text style={styles.hint}>Tap a plan to filter the payment ledger below.</Text>
    </View>
  );
}

function PlanStatChip({
  label,
  count,
  active,
  accent,
  activeBg,
  activeBorder,
  onPress,
  styles,
  loading,
}: {
  label: string;
  count: number;
  active: boolean;
  accent: string;
  activeBg: string;
  activeBorder: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        styles.chip,
        active && { backgroundColor: activeBg, borderColor: activeBorder },
      ]}
    >
      <Text style={[styles.chipLabel, active && { color: accent }]}>{label}</Text>
      {loading ? (
        <View style={styles.countSkeleton} />
      ) : (
        <Text style={[styles.chipCount, active && { color: accent }]}>{count.toLocaleString('en-IN')}</Text>
      )}
      <Text style={styles.chipSub}>libraries</Text>
    </TouchableOpacity>
  );
}

function makeStyles(
  borderColor: string,
  surfaceColor: string,
  textColor: string,
  mutedColor: string,
  cardBasis: string
) {
  return StyleSheet.create({
    root: {
      marginBottom: 18,
      borderRadius: 18,
      borderWidth: 1,
      borderColor,
      backgroundColor: surfaceColor,
      padding: 16,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    overline: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.1,
      color: mutedColor,
    },
    title: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: '900',
      color: textColor,
    },
    errorBanner: {
      marginBottom: 12,
      padding: 10,
      borderRadius: 12,
      backgroundColor: 'rgba(239,68,68,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.2)',
    },
    errorTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.danger },
    retryTxt: { marginTop: 4, fontSize: 11, fontWeight: '700', color: theme.colors.primary },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chip: {
      flexGrow: 1,
      flexBasis: cardBasis,
      minWidth: 96,
      minHeight: 88,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor,
      backgroundColor: surfaceColor,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipLabel: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
      color: mutedColor,
    },
    chipCount: {
      marginTop: 6,
      fontSize: 22,
      fontWeight: '900',
      color: textColor,
    },
    chipSub: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: '700',
      color: mutedColor,
    },
    countSkeleton: {
      marginTop: 10,
      width: 40,
      height: 18,
      borderRadius: 6,
      backgroundColor: borderColor,
      opacity: 0.45,
    },
    hint: {
      marginTop: 12,
      fontSize: 11,
      fontWeight: '700',
      color: mutedColor,
    },
  });
}
