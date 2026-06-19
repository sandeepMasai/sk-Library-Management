import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  CancelledLibrariesModal,
  DashboardWidgetSkeleton,
  NewLibrariesWidget,
  RecentActivityWidget,
  RevenueOverviewWidget,
  useSuperAdminDashboardAnalytics,
  type CancelledLibraryRow,
  type DashboardInsightSection,
} from '../../components/superadmin/dashboard';
import { KpiGridSkeleton, QuickActionsPanel } from '../../components/superadmin/ui';
import { navigateToAdminLibraryDetail } from '../../components/superadmin/navigateToAdminLibraryDetail';
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
  const styles = useMemo(() => makeStyles(mode, isCompact), [mode, isCompact]);
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
  const [subOverview, setSubOverview] = useState({
    active: 0,
    expiringSoon: 0,
    expired: 0,
    cancelled: 0,
  });
  const [planOverview, setPlanOverview] = useState({
    totalLibraries: 0,
    activeSubscribers: 0,
    monthlyRevenue: 0,
    expiringPlans: 0,
  });
  const [cancelledModalOpen, setCancelledModalOpen] = useState(false);
  const [cancelledLoading, setCancelledLoading] = useState(false);
  const [cancelledError, setCancelledError] = useState<string | null>(null);
  const [cancelledLibraries, setCancelledLibraries] = useState<CancelledLibraryRow[]>([]);

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

  const loadPlanOverview = useCallback(async () => {
    try {
      const res = await apiGet<{
        ok: boolean;
        overview: { totalLibraries: number; activeSubscribers: number; monthlyRevenue: number; expiringPlans: number };
      }>(`/api/superadmin/plan-management-overview`);
      const o = res.overview;
      setPlanOverview({
        totalLibraries: o?.totalLibraries ?? 0,
        activeSubscribers: o?.activeSubscribers ?? 0,
        monthlyRevenue: o?.monthlyRevenue ?? 0,
        expiringPlans: o?.expiringPlans ?? 0,
      });
    } catch {
      // keep previous values
    }
  }, []);
  const loadSubscriptionOverview = useCallback(async () => {
    setSubOverviewLoading(true);
    setSubOverviewError(null);
    try {
      const res = await apiGet<{
        ok: boolean;
        overview: { active: number; expiringSoon: number; expired: number; cancelled: number };
      }>(`/api/superadmin/subscription-overview`);
      const o = res.overview;
      setSubOverview({
        active: o?.active ?? 0,
        expiringSoon: o?.expiringSoon ?? 0,
        expired: o?.expired ?? 0,
        cancelled: o?.cancelled ?? 0,
      });
    } catch (e: any) {
      const err = e as ApiError;
      setSubOverviewError(err?.message || 'Failed to load subscription overview');
    } finally {
      setSubOverviewLoading(false);
    }
  }, []);

  const loadCancelledLibraries = useCallback(async () => {
    setCancelledLoading(true);
    setCancelledError(null);
    try {
      const res = await apiGet<{ ok: boolean; count: number; libraries: CancelledLibraryRow[] }>(
        `/api/superadmin/cancelled-libraries`
      );
      setCancelledLibraries(res.libraries || []);
    } catch (e: any) {
      const err = e as ApiError;
      setCancelledError(err?.message || 'Failed to load cancelled libraries');
      setCancelledLibraries([]);
    } finally {
      setCancelledLoading(false);
    }
  }, []);

  const openCancelledModal = useCallback(() => {
    setCancelledModalOpen(true);
    void loadCancelledLibraries();
  }, [loadCancelledLibraries]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (role && role !== 'admin') return;
    load();
  }, [isAuthenticated, role, load]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (role && role !== 'admin') return;
    loadSubscriptionOverview();
    void loadPlanOverview();
  }, [isAuthenticated, role, loadSubscriptionOverview, loadPlanOverview]);

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
    void loadPlanOverview();
  }, [load, refreshAnalytics, loadSubscriptionOverview, loadPlanOverview]);

  const premiumMetrics = useMemo(() => {
    const s = stats || { totalLibraries: 0, activeLibraries: 0, totalStudents: 0, revenue: 0 };
    const rev = revenueSlice.data;
    const spark = rev?.sparkline?.map((p) => p.revenue) || [];
    return [
      {
        label: 'Active Libraries',
        value: String(s.activeLibraries),
        gradient: ['#059669', '#10B981'] as [string, string],
        icon: <Building2 color="#059669" size={20} strokeWidth={2.2} />,
        trendLabel: 'Live on platform',
      },
      {
        label: 'Total Students',
        value: String(s.totalStudents),
        gradient: ['#0284C7', '#0EA5E9'] as [string, string],
        icon: <GraduationCap color="#0284C7" size={20} strokeWidth={2.2} />,
        trendLabel: 'Across libraries',
      },
      {
        label: 'Payment Revenue',
        value: rev ? `₹${Math.round(rev.monthlyRevenue).toLocaleString('en-IN')}` : '—',
        gradient: ['#D97706', '#F59E0B'] as [string, string],
        icon: <IndianRupee color="#D97706" size={20} strokeWidth={2.2} />,
        growthPercent: rev?.growthPercent,
        sparkValues: spark.length ? spark : undefined,
        muted: rev ? `Today ₹${Math.round(rev.todayRevenue).toLocaleString('en-IN')}` : undefined,
      },
      {
        label: 'Platform Revenue',
        value: `₹${Math.round(s.revenue || 0).toLocaleString('en-IN')}`,
        gradient: ['#8B5CF6', '#6D28D9'] as [string, string],
        icon: <IndianRupee color="#8B5CF6" size={20} strokeWidth={2.2} />,
        trendLabel: 'All time',
      },
    ];
  }, [stats, revenueSlice.data]);

  const primaryKpis = useMemo(
    () => [
      {
        label: 'Total Libraries',
        value: String(planOverview.totalLibraries || stats?.totalLibraries || 0),
        gradient: ['#4F46E5', '#6366F1'] as [string, string],
        icon: <LibraryBig color="#4F46E5" size={20} strokeWidth={2.2} />,
        trendLabel: 'Registered',
      },
      {
        label: 'Active Subscribers',
        value: String(planOverview.activeSubscribers || subOverview.active),
        gradient: ['#059669', '#10B981'] as [string, string],
        icon: <Building2 color="#059669" size={20} strokeWidth={2.2} />,
        trendLabel: 'Paid plans',
      },
      {
        label: 'Monthly Revenue',
        value: `₹${(planOverview.monthlyRevenue || 0).toLocaleString('en-IN')}`,
        gradient: ['#D97706', '#F59E0B'] as [string, string],
        icon: <IndianRupee color="#D97706" size={20} strokeWidth={2.2} />,
        growthPercent: revenueSlice.data?.growthPercent,
        trendLabel: revenueSlice.data?.growthPercent == null ? 'This month' : undefined,
      },
      {
        label: 'Expiring Plans',
        value: String(planOverview.expiringPlans || subOverview.expiringSoon),
        gradient: ['#DC2626', '#EF4444'] as [string, string],
        icon: <TrendingUp color="#DC2626" size={20} strokeWidth={2.2} />,
        trendLabel: 'Next 7 days',
      },
    ],
    [planOverview, stats?.totalLibraries, subOverview, revenueSlice.data?.growthPercent]
  );

  const quickActions = useMemo(
    () => [
      { key: 'plan', label: 'Create Plan', icon: 'add-circle-outline' as const, color: '#4F46E5', onPress: () => navigation.navigate('Plans') },
      { key: 'lib', label: 'Add Library', icon: 'business-outline' as const, color: '#059669', onPress: () => navigation.navigate('Libraries') },
      { key: 'sub', label: 'Subscriptions', icon: 'card-outline' as const, color: '#D97706', onPress: () => navigation.navigate('Subscriptions') },
      { key: 'pay', label: 'View Payments', icon: 'wallet-outline' as const, color: '#0284C7', onPress: () => navigation.navigate('Payments') },
    ],
    [navigation]
  );

  const todayRevenue = revenueSlice.data?.todayRevenue ?? planOverview.monthlyRevenue;
  const activeLibraries = stats?.activeLibraries ?? planOverview.totalLibraries;

  const metricCardWidth = useMemo(() => {
    if (windowWidth < 400) return '100%' as const;
    if (windowWidth < 720) return '48%' as const;
    if (windowWidth < 900) return '48%' as const;
    return '23.5%' as const;
  }, [windowWidth]);

  const columnWrapStyle = useMemo(
    () => (isStacked ? { width: '100%' as const, flex: undefined, minWidth: undefined } : { flex: 1, minWidth: 0, maxWidth: '50%' as const }),
    [isStacked]
  );
  const donutValues = [subOverview.active, subOverview.expiringSoon, subOverview.expired, subOverview.cancelled];

  if (!isAuthenticated()) return <LoginScreen />;
  if (role && role !== 'admin') return <ForbiddenScreen message="This page is only for admin accounts." />;

  if (loading) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.welcomeCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <DashboardWidgetSkeleton lines={3} />
        </View>
        <KpiGridSkeleton count={4} />
        <View style={[styles.panel, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <DashboardWidgetSkeleton lines={5} height={180} />
        </View>
      </ScrollView>
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
      <View style={[styles.welcomeCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <View style={styles.welcomeTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.welcomeKicker, { color: theme.colors.primary }]}>SUPER ADMIN</Text>
            <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
              Welcome back, Super Admin 👋
            </Text>
            <Text style={[styles.welcomeSub, { color: theme.colors.mutedText }]}>
              Manage libraries, subscriptions, revenue, plans and platform growth.
            </Text>
          </View>
          <TouchableOpacity onPress={onSyncAll} style={[styles.syncBtn, { borderColor: theme.colors.border }]} activeOpacity={0.88}>
            <Ionicons name="refresh" size={16} color={theme.colors.primary} />
            {!isCompact ? (
              <Text style={[styles.syncTxt, { color: theme.colors.text }]}>
                {analyticsRefreshing ? 'Syncing…' : 'Sync'}
              </Text>
            ) : null}
          </TouchableOpacity>
        </View>
        <View style={[styles.welcomeStats, { borderTopColor: theme.colors.border }]}>
          <View style={styles.welcomeStat}>
            <Text style={[styles.welcomeStatLbl, { color: theme.colors.mutedText }]}>Today's Revenue</Text>
            <Text style={[styles.welcomeStatVal, { color: theme.colors.text }]}>
              ₹{Math.round(todayRevenue || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={[styles.welcomeDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.welcomeStat}>
            <Text style={[styles.welcomeStatLbl, { color: theme.colors.mutedText }]}>Active Libraries</Text>
            <Text style={[styles.welcomeStatVal, { color: theme.colors.text }]}>{activeLibraries}</Text>
          </View>
        </View>
      </View>

      <QuickActionsPanel actions={quickActions} />

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Key Metrics</Text>
      <View style={styles.grid}>
        {primaryKpis.map((c) => (
          <AnalyticsMetricCard
            key={c.label}
            label={c.label}
            value={c.value}
            icon={c.icon}
            gradient={c.gradient}
            growthPercent={c.growthPercent}
            trendLabel={c.trendLabel}
            containerStyle={{ width: metricCardWidth }}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Platform Overview</Text>
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
            trendLabel={c.trendLabel}
            containerStyle={{ width: metricCardWidth }}
          />
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionNavScroll}>
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
      </ScrollView>

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
          onViewCancelled={openCancelledModal}
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
            <DashboardWidgetSkeleton lines={4} height={120} />
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
                colors={[theme.colors.success, theme.colors.warning, theme.colors.danger, '#94A3B8']}
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
                <View style={styles.legendRow}>
                  <View style={[styles.legendSwatch, { backgroundColor: theme.colors.danger }]} />
                  <Text style={[styles.legendTxt, { color: theme.colors.mutedText }]}>Expired</Text>
                  <Text style={[styles.legendVal, { color: theme.colors.text }]}>{subOverview.expired}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.legendRow, styles.legendRowTap, { marginBottom: 0 }]}
                  onPress={openCancelledModal}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="View cancelled libraries"
                >
                  <View style={[styles.legendSwatch, { backgroundColor: '#94A3B8' }]} />
                  <Text style={[styles.legendTxt, { color: theme.colors.mutedText }]}>Cancelled</Text>
                  <View style={styles.legendRight}>
                    <Text style={[styles.legendVal, { color: theme.colors.text }]}>{subOverview.cancelled}</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
      <CancelledLibrariesModal
        visible={cancelledModalOpen}
        loading={cancelledLoading}
        error={cancelledError}
        libraries={cancelledLibraries}
        onClose={() => setCancelledModalOpen(false)}
        onRetry={loadCancelledLibraries}
        onSelectLibrary={(libraryId) => {
          setCancelledModalOpen(false);
          navigateToAdminLibraryDetail(navigation, libraryId);
        }}
        borderColor={theme.colors.border}
        surfaceColor={theme.colors.surface}
        textColor={theme.colors.text}
        mutedColor={theme.colors.mutedText}
      />
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

function makeStyles(mode: 'light' | 'dark', isCompact: boolean) {
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

    welcomeCard: {
      borderRadius: 18,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      overflow: 'hidden',
      ...theme.shadow.card,
    },
    welcomeTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: theme.spacing.lg,
    },
    welcomeKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    welcomeTitle: { marginTop: 6, fontSize: isCompact ? 22 : 26, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32 },
    welcomeSub: { marginTop: 8, fontSize: 14, fontWeight: '600', lineHeight: 21 },
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      backgroundColor: withAlpha(theme.colors.primary, isDark ? 0.12 : 0.06),
    },
    syncTxt: { fontSize: 12, fontWeight: '800' },
    welcomeStats: {
      flexDirection: 'row',
      borderTopWidth: 1,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.lg,
    },
    welcomeStat: { flex: 1 },
    welcomeStatLbl: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    welcomeStatVal: { marginTop: 4, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
    welcomeDivider: { width: 1, marginHorizontal: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, marginBottom: 10, marginTop: 4 },
    sectionNavScroll: { gap: 8, paddingBottom: theme.spacing.sm, paddingRight: 8 },
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
    legendRowTap: {
      borderRadius: theme.radius.md,
      paddingHorizontal: 6,
      marginHorizontal: -6,
    },
    legendRight: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
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

