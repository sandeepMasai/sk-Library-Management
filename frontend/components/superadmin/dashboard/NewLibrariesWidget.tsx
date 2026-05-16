import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Building2, MapPin } from 'lucide-react-native';
import { format } from 'date-fns';
import { theme } from '../../../theme';
import { DashboardWidgetSkeleton } from './DashboardWidgetSkeleton';
import type { RecentLibraryRow } from './types';

type Props = {
  libraries: RecentLibraryRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onViewAll?: () => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  compact?: boolean;
};

export function NewLibrariesWidget({
  libraries,
  loading,
  error,
  onRetry,
  onViewAll,
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
          <Text style={[styles.overline, { color: mutedColor }]}>registrar</Text>
          <Text style={[styles.title, { color: textColor }]}>New libraries</Text>
        </View>
        {onViewAll ? (
          <TouchableOpacity onPress={onViewAll} style={[styles.link, { borderColor }]} activeOpacity={0.88}>
            <Text style={[styles.linkTxt, { color: theme.colors.primary }]}>View all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <DashboardWidgetSkeleton lines={5} />
      ) : error ? (
        <WidgetError message={error} onRetry={onRetry} mutedColor={mutedColor} />
      ) : libraries.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} color={mutedColor} strokeWidth={1.5} />}
          title="No libraries yet"
          body="New registrations will appear here."
          mutedColor={mutedColor}
        />
      ) : (
        <View style={styles.list}>
          {libraries.map((lib, i) => (
            <View
              key={lib.id}
              style={[
                styles.row,
                compact && styles.rowCompact,
                { borderBottomColor: borderColor },
                i % 2 === 1 && { backgroundColor: Platform.OS === 'web' ? 'rgba(99,102,241,0.04)' : undefined },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '18' }]}>
                <Building2 size={16} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
                  {lib.name}
                </Text>
                <Text style={[styles.sub, { color: mutedColor }]} numberOfLines={1}>
                  {lib.ownerName}
                </Text>
                <View style={styles.metaRow}>
                  <MapPin size={11} color={mutedColor} strokeWidth={2} />
                  <Text style={[styles.meta, { color: mutedColor }]} numberOfLines={1}>
                    {[lib.city, lib.state].filter(Boolean).join(', ') || '—'}
                  </Text>
                </View>
              </View>
              <View style={[styles.right, compact && styles.rightCompact]}>
                <View style={[styles.planChip, { borderColor }]}>
                  <Text style={[styles.planTxt, { color: textColor }]}>{lib.planName}</Text>
                </View>
                <Text style={[styles.date, { color: mutedColor }]}>
                  {lib.joinedAt ? format(new Date(lib.joinedAt), 'dd MMM yyyy') : '—'}
                </Text>
                <View style={[styles.statusDot, lib.isActive ? styles.statusOn : styles.statusOff]}>
                  <Text style={[styles.statusTxt, lib.isActive ? styles.statusTxtOn : styles.statusTxtOff]}>
                    {lib.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function WidgetError({ message, onRetry, mutedColor }: { message: string; onRetry: () => void; mutedColor: string }) {
  return (
    <View style={styles.err}>
      <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retry}>
        <Text style={{ color: mutedColor, fontWeight: '800' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
  mutedColor,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={[styles.emptyTitle, { color: mutedColor }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: mutedColor }]}>{body}</Text>
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
  link: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  linkTxt: { fontSize: 12, fontWeight: '900' },
  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCompact: {
    flexWrap: 'wrap',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '800' },
  sub: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta: { fontSize: 11, fontWeight: '600', flex: 1 },
  right: { alignItems: 'flex-end', gap: 4, minWidth: 72, flexShrink: 0 },
  rightCompact: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 4,
    paddingLeft: 50,
  },
  planChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  planTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  date: { fontSize: 10, fontWeight: '700' },
  statusDot: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  statusOn: { backgroundColor: 'rgba(5,150,105,0.12)' },
  statusOff: { backgroundColor: 'rgba(220,38,38,0.1)' },
  statusTxt: { fontSize: 9, fontWeight: '900' },
  statusTxtOn: { color: theme.colors.success },
  statusTxtOff: { color: theme.colors.danger },
  err: { paddingVertical: 16, gap: 10 },
  retry: { alignSelf: 'flex-start' },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyBody: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
