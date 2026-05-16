import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { apiGet, type ApiError } from '../../../services/api';
import { theme } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';
import type { LibraryStudentRow, StudentsStackParamList } from './types';

type Nav = NativeStackNavigationProp<StudentsStackParamList, 'LibraryStudents'>;
type Rt = RouteProp<StudentsStackParamList, 'LibraryStudents'>;

type StatusFilter = 'all' | 'active' | 'inactive';
type ExpiryFilter = 'all' | 'expired' | 'expiring';

export default function AdminLibraryStudentsPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { libraryId } = route.params;
  const { width } = useWindowDimensions();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const compact = width < 720;

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [expiry, setExpiry] = useState<ExpiryFilter>('all');
  const [seat, setSeat] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LibraryStudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [analytics, setAnalytics] = useState({ totalStudents: 0, activeStudents: 0, expiredStudents: 0 });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (p: number, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await apiGet<{
          ok: boolean;
          students: LibraryStudentRow[];
          total: number;
          analytics: typeof analytics;
        }>(`/api/superadmin/libraries/${libraryId}/students`, {
          page: p,
          limit: 20,
          search: debounced || undefined,
          status,
          expiry,
          seat: seat.trim() || undefined,
        });
        setRows(res.students || []);
        setTotal(Number(res.total || 0));
        setAnalytics(res.analytics || { totalStudents: 0, activeStudents: 0, expiredStudents: 0 });
        setPage(p);
      } catch (e) {
        const err = e as ApiError;
        setError(err?.message || 'Failed to load students');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [libraryId, debounced, status, expiry, seat]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const colors = useMemo(
    () => ({
      bg: isDark ? '#0B1220' : '#F8FAFC',
      surface: isDark ? '#131A2B' : '#FFFFFF',
      border: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
      text: isDark ? '#F8FAFC' : '#0F172A',
      muted: isDark ? '#94A3B8' : '#64748B',
      headBg: isDark ? '#1E293B' : '#F1F5F9',
    }),
    [isDark]
  );

  const canPrev = page > 1;
  const canNext = page * 20 < total;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, phone, email…"
          placeholderTextColor={colors.muted}
          style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All" active={status === 'all'} onPress={() => setStatus('all')} />
          <FilterChip label="Active" active={status === 'active'} onPress={() => setStatus('active')} />
          <FilterChip label="Inactive" active={status === 'inactive'} onPress={() => setStatus('inactive')} />
          <FilterChip label="Expired" active={expiry === 'expired'} onPress={() => setExpiry(expiry === 'expired' ? 'all' : 'expired')} />
          <FilterChip label="Expiring ≤7d" active={expiry === 'expiring'} onPress={() => setExpiry(expiry === 'expiring' ? 'all' : 'expiring')} />
        </ScrollView>
        <TextInput
          value={seat}
          onChangeText={setSeat}
          placeholder="Seat #"
          placeholderTextColor={colors.muted}
          style={[styles.seatInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
        />
        <View style={styles.analyticsRow}>
          <MiniStat label="Total" value={analytics.totalStudents} />
          <MiniStat label="Active" value={analytics.activeStudents} />
          <MiniStat label="Expired" value={analytics.expiredStudents} />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(page)}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : compact ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(page, true); }} />}
        >
          {rows.length === 0 ? (
            <Text style={[styles.empty, { color: colors.muted }]}>No students match filters.</Text>
          ) : (
            rows.map((s) => (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('StudentDetail', { studentId: s.id })}
                style={[styles.mobileCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={[styles.mobileName, { color: colors.text }]}>{s.name}</Text>
                <Text style={[styles.mobileMeta, { color: colors.muted }]}>
                  {s.phone} · Seat {s.seatNumber || '—'} · {s.attendancePercent}% attend
                </Text>
                <Text style={[styles.mobileMeta, { color: colors.muted }]}>
                  {s.isActive ? 'Active' : 'Inactive'} · ₹{s.fees} · exp{' '}
                  {s.expiryDate ? format(new Date(s.expiryDate), 'dd MMM yy') : '—'}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(page, true); }} />}
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={[styles.tableHead, { backgroundColor: colors.headBg, borderColor: colors.border }]}>
                <HeadCell w={160} label="Student" />
                <HeadCell w={120} label="Phone" />
                <HeadCell w={140} label="Email" />
                <HeadCell w={72} label="Seat" />
                <HeadCell w={120} label="Timing" />
                <HeadCell w={80} label="Plan" />
                <HeadCell w={80} label="Fees" />
                <HeadCell w={100} label="Joined" />
                <HeadCell w={100} label="Expiry" />
                <HeadCell w={72} label="Status" />
                <HeadCell w={72} label="Attend %" />
              </View>
              {rows.length === 0 ? (
                <Text style={[styles.empty, { color: colors.muted }]}>No students match filters.</Text>
              ) : (
                rows.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('StudentDetail', { studentId: s.id })}
                    style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <Cell w={160} text={s.name} bold compact={false} />
                    <Cell w={120} text={s.phone} compact={false} />
                    <Cell w={140} text={s.email || '—'} compact={false} />
                    <Cell w={72} text={s.seatNumber || '—'} compact={false} />
                    <Cell w={120} text={s.timing || '—'} compact={false} />
                    <Cell w={80} text={s.planDurationDays ? `${s.planDurationDays}d` : '—'} compact={false} />
                    <Cell w={80} text={`₹${s.fees}`} compact={false} />
                    <Cell w={100} text={s.joinDate ? format(new Date(s.joinDate), 'dd MMM yy') : '—'} compact={false} />
                    <Cell w={100} text={s.expiryDate ? format(new Date(s.expiryDate), 'dd MMM yy') : '—'} compact={false} />
                    <Cell
                      w={72}
                      text={s.isActive ? 'Active' : 'Inactive'}
                      color={s.isActive ? theme.colors.success : theme.colors.danger}
                      compact={false}
                    />
                    <Cell w={72} text={`${s.attendancePercent}%`} compact={false} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      <View style={[styles.pager, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity disabled={!canPrev} onPress={() => load(page - 1)} style={[styles.pagerBtn, !canPrev && { opacity: 0.4 }]}>
          <Text style={styles.pagerTxt}>Prev</Text>
        </TouchableOpacity>
        <Text style={[styles.pagerMid, { color: colors.muted }]}>
          Page {page} · {total} students
        </Text>
        <TouchableOpacity disabled={!canNext} onPress={() => load(page + 1)} style={[styles.pagerBtn, !canNext && { opacity: 0.4 }]}>
          <Text style={styles.pagerTxt}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipOn]}
      activeOpacity={0.88}
    >
      <Text style={[styles.chipTxt, active && styles.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniVal}>{value}</Text>
      <Text style={styles.miniLbl}>{label}</Text>
    </View>
  );
}

function HeadCell({ label, w }: { label: string; w: number }) {
  return (
    <Text style={[styles.headCell, { width: w }]} numberOfLines={1}>
      {label}
    </Text>
  );
}

function Cell({
  text,
  w,
  bold,
  color,
  compact,
}: {
  text: string;
  w: number;
  bold?: boolean;
  color?: string;
  compact: boolean;
}) {
  return (
    <Text
      style={[
        styles.cell,
        compact && styles.cellCompact,
        { width: compact ? undefined : w, flex: compact ? 1 : undefined },
        bold && { fontWeight: '900' },
        color ? { color } : null,
      ]}
      numberOfLines={1}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterBar: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    gap: 10,
    zIndex: 2,
    ...theme.shadow.card,
  },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '600',
  },
  seatInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 140,
  },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  chipOn: { backgroundColor: '#4F46E5' },
  chipTxt: { fontSize: 12, fontWeight: '800', color: '#475569' },
  chipTxtOn: { color: '#fff' },
  analyticsRow: { flexDirection: 'row', gap: 8 },
  miniStat: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(79,70,229,0.06)',
  },
  miniVal: { fontSize: 16, fontWeight: '900', color: '#4F46E5' },
  miniLbl: { fontSize: 10, fontWeight: '800', color: '#64748B', marginTop: 2 },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headCell: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { fontSize: 13, fontWeight: '600', color: '#0F172A', paddingRight: 8 },
  cellCompact: { minWidth: '45%', marginBottom: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 32, textAlign: 'center', fontWeight: '700' },
  retryBtn: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#0F172A' },
  retryTxt: { color: '#fff', fontWeight: '900' },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pagerBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#0F172A' },
  pagerTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  pagerMid: { fontSize: 12, fontWeight: '800' },
  mobileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    ...theme.shadow.card,
  },
  mobileName: { fontSize: 16, fontWeight: '900' },
  mobileMeta: { marginTop: 6, fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
