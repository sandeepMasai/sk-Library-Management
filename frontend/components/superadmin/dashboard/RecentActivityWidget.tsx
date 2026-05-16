import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Activity,
  CreditCard,
  GraduationCap,
  LogIn,
  Sparkles,
  UserPlus,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '../../../theme';
import { DashboardWidgetSkeleton } from './DashboardWidgetSkeleton';
import type { ActivityType, RecentActivityRow } from './types';

const ICONS: Record<ActivityType, LucideIcon> = {
  registration: UserPlus,
  payment: CreditCard,
  plan_upgrade: Sparkles,
  student: GraduationCap,
  expiry: AlertTriangle,
  login: LogIn,
  other: Activity,
};

const ACCENT: Record<ActivityType, string> = {
  registration: '#6366F1',
  payment: '#059669',
  plan_upgrade: '#D97706',
  student: '#0EA5E9',
  expiry: '#DC2626',
  login: '#64748B',
  other: '#94A3B8',
};

type Props = {
  activities: RecentActivityRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRefresh?: () => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  compact?: boolean;
};

export function RecentActivityWidget({
  activities,
  loading,
  error,
  onRetry,
  onRefresh,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
  compact = false,
}: Props) {
  return (
    <View style={[styles.panel, { borderColor, backgroundColor: surfaceColor }]}>
      <View style={styles.head}>
        <View>
          <Text style={[styles.overline, { color: mutedColor }]}>live feed</Text>
          <Text style={[styles.title, { color: textColor }]}>Recent activity</Text>
        </View>
        {onRefresh ? (
          <TouchableOpacity onPress={onRefresh} style={[styles.iconBtn, { borderColor }]} accessibilityLabel="Refresh">
            <Activity size={18} color={theme.colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <DashboardWidgetSkeleton lines={6} />
      ) : error ? (
        <View style={styles.err}>
          <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{error}</Text>
          <TouchableOpacity onPress={onRetry}>
            <Text style={{ color: mutedColor, fontWeight: '800' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.empty}>
          <Activity size={32} color={mutedColor} strokeWidth={1.5} />
          <Text style={[styles.emptyTxt, { color: mutedColor }]}>No platform activity yet.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {activities.slice(0, 8).map((a) => {
            const Icon = ICONS[a.type] || ICONS.other;
            const color = ACCENT[a.type] || ACCENT.other;
            const when = a.timestamp
              ? formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })
              : '—';
            return (
              <View
                key={a.id}
                style={[
                  styles.item,
                  compact && styles.itemCompact,
                  { borderColor, backgroundColor: theme.colors.background },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
                  <Icon size={16} color={color} strokeWidth={2.2} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={[styles.itemDesc, { color: mutedColor }]} numberOfLines={2}>
                    {a.description}
                  </Text>
                  {compact ? (
                    <Text style={[styles.whenInline, { color: mutedColor }]}>{when}</Text>
                  ) : null}
                </View>
                {!compact ? <Text style={[styles.when, { color: mutedColor }]}>{when}</Text> : null}
              </View>
            );
          })}
        </View>
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
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  itemCompact: {
    flexWrap: 'wrap',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 13, fontWeight: '800' },
  itemDesc: { marginTop: 3, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  when: { fontSize: 10, fontWeight: '700', maxWidth: 72, textAlign: 'right', flexShrink: 0, marginTop: 2 },
  whenInline: { fontSize: 10, fontWeight: '700', marginTop: 6 },
  err: { paddingVertical: 16, gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyTxt: { fontSize: 14, fontWeight: '600', fontStyle: 'italic' },
});
