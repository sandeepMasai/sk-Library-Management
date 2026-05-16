import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Building2, ChevronRight, MapPin, Search, Users } from 'lucide-react-native';
import { apiGet, type ApiError } from '../../../services/api';
import { useAppStore } from '../../../store';
import { theme } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';
import LoginScreen from '../../../screens/auth/LoginScreen';
import ForbiddenScreen from '../../../screens/common/ForbiddenScreen';
import type { LibraryWithStudentStats, StudentsStackParamList } from './types';

type Nav = NativeStackNavigationProp<StudentsStackParamList, 'StudentsLibraryList'>;

export default function AdminStudentsLibrariesPage() {
  const navigation = useNavigation<Nav>();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LibraryWithStudentStats[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalStudents: 0, activeStudents: 0, expiredStudents: 0 });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p: number, q: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{
        ok: boolean;
        libraries: LibraryWithStudentStats[];
        total: number;
        summary: typeof summary;
      }>('/api/superadmin/libraries', { page: p, limit: 12, search: q || undefined });
      setRows(res.libraries || []);
      setTotal(Number(res.total || 0));
      setSummary(res.summary || { totalStudents: 0, activeStudents: 0, expiredStudents: 0 });
      setPage(p);
    } catch (e) {
      const err = e as ApiError;
      setError(err?.message || 'Failed to load libraries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (role && role !== 'admin') return;
    load(1, debounced);
  }, [isAuthenticated, role, debounced, load]);

  const colors = useMemo(
    () => ({
      bg: isDark ? '#0B1220' : '#F8FAFC',
      surface: isDark ? '#131A2B' : '#FFFFFF',
      border: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
      text: isDark ? '#F8FAFC' : '#0F172A',
      muted: isDark ? '#94A3B8' : '#64748B',
    }),
    [isDark]
  );

  if (!isAuthenticated()) return <LoginScreen />;
  if (role && role !== 'admin') return <ForbiddenScreen message="This page is only for admin accounts." />;

  const canPrev = page > 1;
  const canNext = page * 12 < total;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.kicker, { color: colors.muted }]}>STUDENTS HUB</Text>
        <Text style={[styles.title, { color: colors.text }]}>Browse by library</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          Select a library to view its students — scalable for multi-tenant SaaS.
        </Text>

        <View style={styles.statsRow}>
          <StatPill label="Total" value={summary.totalStudents} color="#4F46E5" />
          <StatPill label="Active" value={summary.activeStudents} color="#059669" />
          <StatPill label="Expired" value={summary.expiredStudents} color="#DC2626" />
        </View>

        <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.bg }]}>
          <Search size={18} color={colors.muted} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search library, owner, city…"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(page, debounced)}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(page, debounced, true); }} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() =>
                navigation.navigate('LibraryStudents', { libraryId: item.id, libraryName: item.name })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Building2 size={20} color="#4F46E5" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.libName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.owner, { color: colors.muted }]} numberOfLines={1}>
                    {item.ownerName}
                  </Text>
                </View>
                <View style={[styles.statusPill, item.isActive ? styles.statusOn : styles.statusOff]}>
                  <Text style={[styles.statusTxt, item.isActive ? styles.statusTxtOn : styles.statusTxtOff]}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <MapPin size={13} color={colors.muted} />
                <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
                  {[item.city, item.state].filter(Boolean).join(', ') || '—'}
                </Text>
              </View>

              <View style={styles.metrics}>
                <Metric label="Students" value={String(item.totalStudents)} />
                <Metric label="Active" value={String(item.activeStudents)} />
                <Metric label="Plan" value={item.planName} />
                <Metric label="Fees collected" value={`₹${Math.round(item.revenue).toLocaleString('en-IN')}`} />
              </View>

              <View style={styles.cardFoot}>
                <Users size={14} color={theme.colors.primary} />
                <Text style={[styles.footTxt, { color: theme.colors.primary }]}>View students</Text>
                <ChevronRight size={16} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>No libraries found.</Text>
          }
        />
      )}

      <View style={[styles.pager, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity disabled={!canPrev} onPress={() => load(page - 1, debounced)} style={[styles.pagerBtn, !canPrev && { opacity: 0.4 }]}>
          <Text style={styles.pagerTxt}>Prev</Text>
        </TouchableOpacity>
        <Text style={[styles.pagerMid, { color: colors.muted }]}>
          Page {page} · {total} libraries
        </Text>
        <TouchableOpacity disabled={!canNext} onPress={() => load(page + 1, debounced)} style={[styles.pagerBtn, !canNext && { opacity: 0.4 }]}>
          <Text style={styles.pagerTxt}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '33' }]}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLbl}>{label}</Text>
      <Text style={styles.metricVal} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    ...theme.shadow.card,
  },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.6, marginTop: 4 },
  sub: { fontSize: 13, fontWeight: '600', marginTop: 6, lineHeight: 19 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLbl: { fontSize: 10, fontWeight: '800', color: '#64748B', marginTop: 2, textTransform: 'uppercase' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600' },
  list: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: 12 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libName: { fontSize: 16, fontWeight: '900' },
  owner: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusOn: { backgroundColor: 'rgba(5,150,105,0.12)' },
  statusOff: { backgroundColor: 'rgba(220,38,38,0.1)' },
  statusTxt: { fontSize: 10, fontWeight: '900' },
  statusTxtOn: { color: '#059669' },
  statusTxtOff: { color: '#DC2626' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  meta: { fontSize: 12, fontWeight: '600', flex: 1 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  metric: { minWidth: '22%', flexGrow: 1 },
  metricLbl: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  metricVal: { marginTop: 3, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
  footTxt: { flex: 1, fontSize: 13, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#0F172A' },
  retryTxt: { color: '#fff', fontWeight: '900' },
  empty: { textAlign: 'center', paddingVertical: 40, fontWeight: '700' },
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
});
