import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Building2,
  GraduationCap,
  IndianRupee,
  LibraryBig,
  TrendingUp,
} from 'lucide-react-native';
import {
  AnalyticsMetricCard,
  NewLibrariesWidget,
  RecentActivityWidget,
  RevenueOverviewWidget,
  useSuperAdminDashboardAnalytics,
  type DashboardInsightSection,
} from '../../components/superadmin/dashboard';
import { apiGet, type ApiError } from '../../services/api';
import { useAppStore } from '../../store';
import { theme } from '../../theme';
import LoginScreen from '../../screens/auth/LoginScreen';
import ForbiddenScreen from '../../screens/common/ForbiddenScreen';
import { DonutChart } from '../../components/ui/SimpleCharts';
import { useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type AdminStats = {
  totalLibraries: number;
  activeLibraries: number;
  totalStudents: number;
  revenue: number;
};

type SubscriptionRow = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  plan: 'none' | 'pro';
  expiryDate: string | null;
  status: 'active' | 'expired';
  isActive: boolean;
};

/**
 * AdminDashboardPage — platform admin home (Operations Dashboard).
 */
const INSIGHT_SECTIONS: { key: DashboardInsightSection; label: string }[] = [
  { key: 'new-libraries', label: 'New Libraries' },
  { key: 'recent-activity', label: 'Recent Activity' },
  { key: 'revenue-overview', label: 'Payment revenue' },
];

export default function AdminDashboardPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 720;
  const isStacked = windowWidth < 960;
  const scrollRef = React.useRef<ScrollView>(null);
  const sectionOffsets = React.useRef<Partial<Record<DashboardInsightSection, number>>>({});
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const analyticsEnabled = isAuthenticated() && (!role || role === 'admin');
  const {
    libraries: recentLibsSlice,
    activities: activitySlice,
    revenue: revenueSlice,
    refreshing: analyticsRefreshing,
    refreshAll: refreshAnalytics,
    retryLibraries,
    retryActivities,
    retryRevenue,
  } = useSuperAdminDashboardAnalytics(analyticsEnabled);
  const [subOverviewLoading, setSubOverviewLoading] = useState(false);
  const [subOverviewError, setSubOverviewError] = useState<string | null>(null);
  const [subOverview, setSubOverview] = useState<{ active: number; expiringSoon: number; expired: number }>({
    active: 0,
    expiringSoon: 0,
    expired: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dash = await apiGet<{ ok: boolean; stats: AdminStats }>(`/api/admin/dashboard`);
      setStats(dash.stats);
    } catch (e: any) {
      const err = e as ApiError;
      setError(err?.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubscriptionOverview = useCallback(async () => {
    setSubOverviewLoading(true);
    setSubOverviewError(null);
    try {
      const res = await apiGet<{ ok: boolean; rows: SubscriptionRow[] }>(`/api/admin/subscriptions`, { status: 'all' });
      const rows = res.rows || [];
      const now = Date.now();
      const soonMs = 7 * 24 * 60 * 60 * 1000;
      let active = 0;
      let expiringSoon = 0;
      let expired = 0;
      for (const r of rows) {
        if (r.status === 'expired') {
          expired += 1;
          continue;
        }
        active += 1;
        if (r.expiryDate) {
          const t = new Date(r.expiryDate).getTime();
          if (Number.isFinite(t) && t - now <= soonMs) expiringSoon += 1;
        }
      }
      setSubOverview({ active, expiringSoon, expired });
    } catch (e: any) {
      const err = e as ApiError;
      setSubOverviewError(err?.message || 'Failed to load subscription overview');
    } finally {
      setSubOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (role && role !== 'admin') return;
    load();
  }, [isAuthenticated, role, load]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (role && role !== 'admin') return;
    loadSubscriptionOverview();
  }, [isAuthenticated, role, loadSubscriptionOverview]);

  const scrollToInsight = useCallback((section: DashboardInsightSection) => {
    const y = sectionOffsets.current[section];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }, []);

  useEffect(() => {
    const section = route.params?.section as DashboardInsightSection | undefined;
    if (!section) return;
    const t = setTimeout(() => scrollToInsight(section), 320);
    return () => clearTimeout(t);
  }, [route.params?.section, scrollToInsight]);

  const onSyncAll = useCallback(() => {
    void load();
    void refreshAnalytics(false);
    void loadSubscriptionOverview();
  }, [load, refreshAnalytics, loadSubscriptionOverview]);

  const premiumMetrics = useMemo(() => {
    const s = stats || { totalLibraries: 0, activeLibraries: 0, totalStudents: 0, revenue: 0 };
    const rev = revenueSlice.data;
    const spark = rev?.sparkline?.map((p) => p.revenue) || [];
    return [
      {
        label: 'Total Libraries',
        value: String(s.totalLibraries),
        gradient: ['#4F46E5', '#6366F1'] as [string, string],
        icon: <LibraryBig color="#fff" size={20} strokeWidth={2.2} />,
      },
      {
        label: 'Active Libraries',
        value: String(s.activeLibraries),
        gradient: ['#059669', '#10B981'] as [string, string],
        icon: <Building2 color="#fff" size={20} strokeWidth={2.2} />,
      },
      {
        label: 'Total Students',
        value: String(s.totalStudents),
        gradient: ['#0284C7', '#0EA5E9'] as [string, string],
        icon: <GraduationCap color="#fff" size={20} strokeWidth={2.2} />,
      },
      {
        label: 'Subscription revenue',
        value: rev ? `₹${Math.round(rev.monthlyRevenue).toLocaleString('en-IN')}` : '—',
        gradient: ['#D97706', '#F59E0B'] as [string, string],
        icon: <IndianRupee color="#fff" size={20} strokeWidth={2.2} />,
        growthPercent: rev?.growthPercent,
        sparkValues: spark.length ? spark : undefined,
        muted: rev ? `This month · today ₹${Math.round(rev.todayRevenue).toLocaleString('en-IN')}` : 'Loading payment data…',
      },
    ];
  }, [stats, revenueSlice.data]);

  const metricCardWidth = useMemo(() => {
    if (windowWidth < 480) return '100%' as const;
    if (windowWidth < 900) return '48%' as const;
    return '23.5%' as const;
  }, [windowWidth]);

  const columnWrapStyle = useMemo(
    () => (isStacked ? { width: '100%' as const, flex: undefined, minWidth: undefined } : { flex: 1, minWidth: 0, maxWidth: '50%' as const }),
    [isStacked]
  );
  const donutValues = [subOverview.active, subOverview.expiringSoon, subOverview.expired];

  if (!isAuthenticated()) return <LoginScreen />;
  if (role && role !== 'admin') return <ForbiddenScreen message="This page is only for admin accounts." />;

  if (loading) {
    return (
      <View style={[styles.shell, styles.center]}>
        <View style={[styles.loadCard, { borderColor: theme.colors.border }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadLabel, { color: theme.colors.mutedText }]}>Syncing platform metrics…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.shell, styles.center, { padding: 22 }]}>
        <View style={[styles.errorCard, { borderColor: withAlpha(theme.colors.danger, 0.25) }]}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.danger} />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>Dashboard couldn’t load</Text>
          <Text style={[styles.errorBody, { color: theme.colors.mutedText }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]} onPress={load} activeOpacity={0.88}>
            <Text style={styles.retryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <View style={styles.heroInner}>
          <View style={styles.heroTop}>
            <View style={[styles.rolePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <View style={[styles.roleDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.rolePillTxt, { color: theme.colors.mutedText }]}>Platform admin</Text>
            </View>
            <TouchableOpacity onPress={onSyncAll} style={[styles.refreshPill, { borderColor: theme.colors.border }]} activeOpacity={0.88}>
              <Ionicons name="refresh" size={16} color={theme.colors.primary} />
              <Text style={[styles.refreshPillTxt, { color: theme.colors.text }]}>
                {analyticsRefreshing ? 'Syncing…' : 'Sync'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Operations</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.mutedText }]}>Libraries, revenue, subscriptions & audit trail.</Text>
          <Text style={[styles.heroMono, { color: theme.colors.mutedText }]}>
            Library subscriptions & Razorpay payments · refreshes every minute
          </Text>
        </View>
      </View>

      <View style={styles.sectionNav}>
        {INSIGHT_SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => scrollToInsight(s.key)}
            style={[styles.sectionChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            activeOpacity={0.88}
          >
            <TrendingUp size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.sectionChipTxt, { color: theme.colors.text }]} numberOfLines={1}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.grid}>
        {premiumMetrics.map((c) => (
          <AnalyticsMetricCard
            key={c.label}
            label={c.label}
            value={c.value}
            icon={c.icon}
            gradient={c.gradient}
            growthPercent={c.growthPercent}
            sparkValues={c.sparkValues}
            muted={c.muted}
            containerStyle={{ width: metricCardWidth }}
          />
        ))}
      </View>

      <View
        style={styles.sectionBlock}
        onLayout={(e) => {
          sectionOffsets.current['revenue-overview'] = e.nativeEvent.layout.y;
        }}
      >
        <RevenueOverviewWidget
          overview={revenueSlice.data}
          loading={revenueSlice.loading}
          error={revenueSlice.error}
          onRetry={retryRevenue}
          borderColor={theme.colors.border}
          surfaceColor={theme.colors.surface}
          textColor={theme.colors.text}
          mutedColor={theme.colors.mutedText}
          backgroundColor={theme.colors.background}
          compact={isCompact}
        />
      </View>

      <View style={[styles.mainRow, isStacked && styles.mainRowStacked]}>
        <View
          style={columnWrapStyle}
          onLayout={(e) => {
            sectionOffsets.current['new-libraries'] = e.nativeEvent.layout.y;
          }}
        >
          <NewLibrariesWidget
            libraries={recentLibsSlice.data || []}
            loading={recentLibsSlice.loading}
            error={recentLibsSlice.error}
            onRetry={retryLibraries}
            onViewAll={() => navigation.navigate('Libraries')}
            borderColor={theme.colors.border}
            surfaceColor={theme.colors.surface}
            textColor={theme.colors.text}
            mutedColor={theme.colors.mutedText}
            compact={isCompact}
          />
        </View>
        <View
          style={columnWrapStyle}
          onLayout={(e) => {
            sectionOffsets.current['recent-activity'] = e.nativeEvent.layout.y;
          }}
        >
          <RecentActivityWidget
            activities={activitySlice.data || []}
            loading={activitySlice.loading}
            error={activitySlice.error}
            onRetry={retryActivities}
            onRefresh={() => void refreshAnalytics(false)}
            borderColor={theme.colors.border}
            surfaceColor={theme.colors.surface}
            textColor={theme.colors.text}
            mutedColor={theme.colors.mutedText}
            compact={isCompact}
          />
        </View>
      </View>

      <View style={[styles.mainRow, isStacked && styles.mainRowStacked]}>
        <View
          style={[
            styles.panel,
            columnWrapStyle,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.panelHeadRow}>
            <View>
              <Text style={[styles.panelOverline, { color: theme.colors.mutedText }]}>Subscriptions</Text>
              <Text style={[styles.panelTitle, { color: theme.colors.text }]}>Library plan status</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.miniLink, { borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('AdminRoot', { screen: 'Subscriptions' })}
            >
              <Text style={[styles.miniLinkTxt, { color: theme.colors.primary }]}>All</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {subOverviewLoading ? (
            <View style={styles.panelLoading}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.mutedBold, { color: theme.colors.mutedText }]}>Aggregating rows…</Text>
            </View>
          ) : subOverviewError ? (
            <View style={styles.panelError}>
              <Text style={[styles.errTitle, { color: theme.colors.danger }]}>Could not load overview</Text>
              <Text style={[styles.errBody, { color: theme.colors.mutedText }]}>{subOverviewError}</Text>
              <TouchableOpacity style={[styles.retryGhost, { borderColor: theme.colors.border }]} onPress={loadSubscriptionOverview} activeOpacity={0.88}>
                <Text style={[styles.retryGhostTxt, { color: theme.colors.text }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
              <DonutChart
                size={168}
                thickness={14}
                values={donutValues}
                colors={[theme.colors.success, theme.colors.warning, theme.colors.danger]}
              />
              <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendSwatch, { backgroundColor: theme.colors.success }]} />
                  <Text style={[styles.legendTxt, { color: theme.colors.mutedText }]}>Active</Text>
                  <Text style={[styles.legendVal, { color: theme.colors.text }]}>{subOverview.active}</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendSwatch, { backgroundColor: theme.colors.warning }]} />
                  <Text style={[styles.legendTxt, { color: theme.colors.mutedText }]}>Expiring ≤7 days</Text>
                  <Text style={[styles.legendVal, { color: theme.colors.text }]}>{subOverview.expiringSoon}</Text>
                </View>
                <View style={[styles.legendRow, { marginBottom: 0 }]}>
                  <View style={[styles.legendSwatch, { backgroundColor: theme.colors.danger }]} />
                  <Text style={[styles.legendTxt, { color: theme.colors.mutedText }]}>Expired</Text>
                  <Text style={[styles.legendVal, { color: theme.colors.text }]}>{subOverview.expired}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function withAlpha(hex: string, alpha: number) {
  const h = String(hex || '').replace('#', '').trim();
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function makeStyles(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    shell: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.35,
      maxWidth: 1100,
      width: '100%',
      alignSelf: 'center',
    },
    center: { alignItems: 'center', justifyContent: 'center' },

    hero: {
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadow.card,
      flexDirection: 'row',
    },
    heroAccent: {
      width: 5,
      backgroundColor: theme.colors.primary,
    },
    heroInner: {
      flex: 1,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    heroTop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: theme.spacing.sm,
    },
    rolePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
    },
    roleDot: { width: 6, height: 6, borderRadius: 3 },
    rolePillTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
    refreshPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      backgroundColor: withAlpha(theme.colors.primary, isDark ? 0.14 : 0.08),
    },
    refreshPillTxt: { fontSize: 13, fontWeight: '800' },
    heroTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
    heroSubtitle: { marginTop: 6, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    heroMono: { marginTop: 10, fontSize: 12, fontWeight: '600', opacity: 0.9 },
    loadCard: {
      paddingVertical: 32,
      paddingHorizontal: 28,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      alignItems: 'center',
      gap: 12,
      ...theme.shadow.card,
      backgroundColor: theme.colors.surface,
    },
    loadLabel: { fontSize: 15, fontWeight: '700' },
    loadHint: { fontSize: 11, letterSpacing: 0.6 },

    errorCard: {
      maxWidth: 360,
      width: '100%',
      alignItems: 'center',
      padding: 26,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      gap: 10,
      backgroundColor: theme.colors.surface,
      ...theme.shadow.card,
    },
    errorTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.4, textAlign: 'center' },
    errorBody: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
    retryBtn: { marginTop: 8, borderRadius: theme.radius.md, paddingHorizontal: 22, paddingVertical: 12 },
    retryTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },

    sectionNav: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: theme.spacing.sm,
    },
    sectionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      maxWidth: '100%',
      ...theme.shadow.card,
    },
    sectionChipTxt: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
    sectionBlock: { width: '100%', marginBottom: theme.spacing.md },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: theme.spacing.md,
      width: '100%',
    },
    statCard: {
      flexGrow: 1,
      minWidth: 158,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
      ...theme.shadow.card,
      flexDirection: 'row',
    },
    statStripe: { width: 4 },
    statBody: { flex: 1, padding: 14 },
    statIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    statVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
    statLbl: { marginTop: 4, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },

    mainRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
      width: '100%',
    },
    mainRowStacked: {
      flexDirection: 'column',
    },

    panel: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.spacing.md,
      ...theme.shadow.card,
    },
    panelHead: { marginBottom: 6 },
    panelHeadRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    panelOverline: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 4 },
    panelTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
    panelHint: { fontSize: 10, marginBottom: 12, letterSpacing: 0.4 },
    panelLoading: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 12,
    },
    panelError: {
      paddingVertical: 14,
      gap: 8,
    },
    errTitle: { fontSize: 15, fontWeight: '900' },
    errBody: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    mutedBold: { fontSize: 13, fontWeight: '700' },

    segment: {
      flexDirection: 'row',
      borderRadius: theme.radius.md,
      borderWidth: 1,
      padding: 4,
      marginBottom: theme.spacing.sm,
      gap: 4,
    },
    segmentItem: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
    },
    segmentItemOn: {},
    segmentTxt: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

    chartInset: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    chartLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    chartFoot: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    chartLegend: { fontSize: 11, fontWeight: '700' },

    miniLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
    },
    miniLinkTxt: { fontSize: 12, fontWeight: '900' },
    iconGhost: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryGhost: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
    },
    retryGhostTxt: { fontSize: 13, fontWeight: '900' },

    legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    legendSwatch: { width: 10, height: 10, borderRadius: 4, marginRight: 10 },
    legendTxt: { flex: 1, fontSize: 13, fontWeight: '600' },
    legendVal: { fontSize: 13, fontWeight: '900' },

    activityCard: {
      flexDirection: 'row',
      borderRadius: theme.radius.md,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
    },
    activityRail: {
      width: 3,
      borderRadius: 2,
      alignSelf: 'stretch',
      marginVertical: 2,
    },
    activityTitle: { fontSize: 13, fontWeight: '800' },
    activityMeta: { marginTop: 4, fontSize: 11, lineHeight: 15 },
    emptyTxt: { fontSize: 14, fontWeight: '600', fontStyle: 'italic', paddingVertical: 16 },

    planChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
    },
    planChipTxt: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowHead: { paddingVertical: 8 },
    cell: { fontSize: 13, fontWeight: '600' },
    hCell: { fontWeight: '800', letterSpacing: 0.35, fontSize: 10, textTransform: 'uppercase' },

    modalBackdrop: {
      flex: 1,
      backgroundColor: withAlpha(theme.colors.dark, 0.55),
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },
    modalCard: {
      width: '100%',
      maxWidth: 520,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadow.card,
    },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    modalTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: theme.colors.text,
    },
    targetRow: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: theme.radius.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    targetTxt: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
    targetSub: { marginTop: 3, fontSize: 11, fontWeight: '700', color: theme.colors.mutedText },
  });
}

