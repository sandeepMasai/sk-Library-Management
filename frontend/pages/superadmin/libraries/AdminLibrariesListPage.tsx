import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { apiDelete, apiGet, apiPatch, type ApiError } from '../../../services/api';
import { useAppStore } from '../../../store';
import { theme } from '../../../theme';
import LoginScreen from '../../../screens/auth/LoginScreen';
import ForbiddenScreen from '../../../screens/common/ForbiddenScreen';
import { useTheme } from '../../../theme/ThemeProvider';
import type { PlanTypeFilter } from '../../../components/superadmin/filters';
import { navigateToAdminLibraryDetail } from '../../../components/superadmin/navigateToAdminLibraryDetail';
import type { LibrariesStackParamList } from './types';
import { PLAN_FILTER_SCREEN_TITLES } from './types';

const PLAN_LABELS: Record<string, string> = {
  none: 'Free',
  trial: 'Trial',
  monthly: 'Monthly',
  '6month': '6-Month',
  yearly: 'Yearly',
};

function planChipLabel(lib: LibraryRow) {
  const key = String(lib.currentPlanKey || (lib.plan === 'pro' ? 'monthly' : 'none')).toLowerCase();
  if (lib.plan === 'pro' && key !== 'trial') return PLAN_LABELS[key] || 'Pro';
  return PLAN_LABELS[key] || key;
}

type LibraryRow = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  plan: 'none' | 'pro';
  currentPlanKey?: string;
  isActive: boolean;
  planExpiryDate: string | null;
  libraryCode?: string;
  studentCount?: number;
  subscriptionStatus?: 'active' | 'cancelled' | 'expired';
  cancelReason?: string | null;
  cancelNote?: string | null;
};

type Route = RouteProp<LibrariesStackParamList, 'LibrariesFiltered'>;
type Nav = NativeStackNavigationProp<LibrariesStackParamList, 'LibrariesFiltered'>;

/** Filtered libraries list — opened after tapping a plan card on the hub. */
export default function AdminLibrariesListPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const planType: PlanTypeFilter = route.params?.planType ?? 'all';
  const searchQuery = route.params?.search ?? '';

  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [total, setTotal] = useState(0);

  const screenTitle = PLAN_FILTER_SCREEN_TITLES[planType] || 'Libraries';

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<{ ok: boolean; libraries: any[]; total: number }>(`/api/admin/libraries`, {
          page: p,
          limit: 10,
          includeCounts: 1,
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
          ...(planType !== 'all' ? { planType } : {}),
        });
        setRows(res.libraries || []);
        setTotal(Number(res.total || 0));
        setPage(p);
      } catch (e: any) {
        setError((e as ApiError)?.message || 'Failed to load libraries');
      } finally {
        setLoading(false);
      }
    },
    [planType, searchQuery]
  );

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (role && role !== 'admin') return;
    load(1);
  }, [isAuthenticated, role, load]);

  const canPrev = page > 1;
  const canNext = page * 10 < total && rows.length === 10;

  const onToggle = async (lib: LibraryRow) => {
    const prev = rows;
    setRows((list) => list.map((x) => (x.id === lib.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await apiPatch(`/api/admin/libraries/${lib.id}/block`, { isActive: !lib.isActive });
    } catch {
      setRows(prev);
      Alert.alert('Error', 'Failed to update library');
    }
  };

  if (!isAuthenticated()) return <LoginScreen />;
  if (role && role !== 'admin') return <ForbiddenScreen message="This page is only for admin accounts." />;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.88}>
          <ChevronLeft size={22} color={theme.colors.text} />
          <Text style={styles.backTxt}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => load(page)} style={styles.iconBtn} activeOpacity={0.85}>
          <Ionicons name="refresh" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.head}>
        <Text style={styles.title}>{screenTitle}</Text>
        <Text style={styles.sub}>
          {total} found · page {page}
          {planType !== 'all' ? ` · ${planType.toUpperCase()}` : ''}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{error}</Text>
          <TouchableOpacity onPress={() => load(page)}>
            <Text style={{ color: theme.colors.primary, fontWeight: '900', marginTop: 6 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        renderItem={({ item }) => {
          const bg = item.isActive ? '#ECFDF5' : '#FEF2F2';
          const fg = item.isActive ? '#059669' : '#DC2626';
          const border = item.isActive ? '#A7F3D0' : '#FECACA';
          return (
            <View style={styles.card}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.ownerName} · {item.email}
              </Text>
              <Text style={styles.meta2} numberOfLines={1}>
                Code: {item.libraryCode || '—'} · Students: {item.studentCount ?? '—'}
              </Text>
              <View style={styles.row}>
                <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
                  <Text style={[styles.badgeTxt, { color: fg }]}>{item.isActive ? 'Active' : 'Blocked'}</Text>
                </View>
                <Text style={styles.plan}>{planChipLabel(item)}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    onPress={() => navigateToAdminLibraryDetail(navigation, item.id)}
                    style={[styles.smallBtn, { backgroundColor: theme.colors.surface }]}
                  >
                    <Text style={[styles.smallTxt, { color: theme.colors.text }]}>Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onToggle(item)} style={styles.smallBtn}>
                    <Text style={styles.smallTxt}>{item.isActive ? 'Block' : 'Unblock'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyLoad}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.empty}>Loading…</Text>
            </View>
          ) : (
            <Text style={styles.empty}>No libraries in this category.</Text>
          )
        }
      />

      <View style={styles.pager}>
        <TouchableOpacity
          disabled={!canPrev || loading}
          onPress={() => load(page - 1)}
          style={[styles.pagerBtn, !canPrev && { opacity: 0.5 }]}
        >
          <Text style={styles.pagerTxt}>Prev</Text>
        </TouchableOpacity>
        <Text style={styles.pagerMid}>Page {page}</Text>
        <TouchableOpacity
          disabled={!canNext || loading}
          onPress={() => load(page + 1)}
          style={[styles.pagerBtn, !canNext && { opacity: 0.5 }]}
        >
          <Text style={styles.pagerTxt}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function makeStyles(_mode: 'light' | 'dark') {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
    backTxt: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    head: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
    title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
    sub: { fontSize: 12, fontWeight: '700', color: theme.colors.mutedText, marginTop: 4 },
    errorBanner: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: 12,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.danger, 0.25),
      backgroundColor: withAlpha(theme.colors.danger, 0.06),
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 10,
      ...theme.shadow.card,
    },
    name: { fontSize: 16, fontWeight: '900', color: theme.colors.text },
    meta: { marginTop: 4, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText },
    meta2: { marginTop: 2, fontSize: 12, fontWeight: '800', color: theme.colors.mutedText },
    row: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    badge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    badgeTxt: { fontSize: 11, fontWeight: '900' },
    plan: { fontWeight: '900', color: theme.colors.mutedText, fontSize: 12 },
    smallBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.primary, 0.35),
      backgroundColor: withAlpha(theme.colors.primary, 0.12),
    },
    smallTxt: { fontWeight: '900', color: theme.colors.primary, fontSize: 11 },
    emptyLoad: { alignItems: 'center', paddingVertical: 40 },
    empty: { textAlign: 'center', color: theme.colors.mutedText, fontWeight: '700', fontStyle: 'italic', paddingVertical: 24 },
    pager: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    pagerBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.colors.dark },
    pagerTxt: { color: theme.colors.surface, fontWeight: '900' },
    pagerMid: { fontWeight: '900', color: theme.colors.mutedText },
  });
}
