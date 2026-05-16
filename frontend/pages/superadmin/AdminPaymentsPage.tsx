import React, { useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RefreshCw, Wallet } from 'lucide-react-native';
import { useAppStore } from '../../store';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import LoginScreen from '../../screens/auth/LoginScreen';
import ForbiddenScreen from '../../screens/common/ForbiddenScreen';
import {
  PaymentChartsPanel,
  PaymentDataTable,
  PaymentExportBar,
  PaymentFiltersBar,
  PaymentKpiGrid,
  PaymentViewModal,
  usePaymentsDashboard,
  type PaymentRow,
} from '../../components/superadmin/payments';
import { navigateToAdminLibraryDetail } from '../../components/superadmin/navigateToAdminLibraryDetail';

/**
 * Super Admin — Payment Details dashboard (SmartLibDesk).
 * APIs: GET /api/superadmin/payments/overview, GET /api/superadmin/payments
 */
export default function AdminPaymentsPage() {
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);
  const enabled = isAuthenticated() && (!role || role === 'admin');

  const {
    filters,
    updateFilters,
    clearModalFilters,
    page,
    setPage,
    limit,
    total,
    rows,
    totals,
    overview,
    overviewLoading,
    overviewError,
    listLoading,
    listError,
    refresh,
    loadOverview,
    loadList,
  } = usePaymentsDashboard(enabled);

  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const borderColor = mode === 'dark' ? 'rgba(148,163,184,0.18)' : theme.colors.border;
  const surfaceColor = theme.colors.surface;
  const textColor = theme.colors.text;
  const mutedColor = theme.colors.mutedText;
  const backgroundColor = theme.colors.background;

  const styles = useMemo(() => makeStyles(backgroundColor), [backgroundColor]);

  if (!isAuthenticated()) return <LoginScreen />;
  if (role && role !== 'admin') return <ForbiddenScreen message="This page is only for admin accounts." />;

  const onView = (row: PaymentRow) => {
    setSelected(row);
    setModalOpen(true);
  };

  const onLibraryDetails = (row: PaymentRow) => {
    if (!row.libraryId) return;
    navigateToAdminLibraryDetail(navigation, row.libraryId);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={listLoading && overviewLoading} onRefresh={refresh} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Wallet size={22} color="#E0E7FF" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>SUPER ADMIN · FINANCE</Text>
          <Text style={[styles.title, { color: textColor }]}>Payment Details</Text>
          <Text style={[styles.sub, { color: mutedColor }]}>
            Cross-library Razorpay ledger, analytics, and exports
          </Text>
        </View>
        <TouchableOpacity onPress={refresh} style={[styles.refreshBtn, { borderColor }]}>
          <RefreshCw size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {overviewError ? (
        <View style={[styles.banner, { borderColor, backgroundColor: 'rgba(239,68,68,0.08)' }]}>
          <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{overviewError}</Text>
          <TouchableOpacity onPress={loadOverview}>
            <Text style={{ color: theme.colors.primary, fontWeight: '900', marginTop: 6 }}>Retry analytics</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <PaymentKpiGrid overview={overview} loading={overviewLoading} />

      <PaymentChartsPanel
        overview={overview}
        loading={overviewLoading}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        mutedColor={mutedColor}
        backgroundColor={backgroundColor}
      />

      <PaymentExportBar rows={rows} borderColor={borderColor} surfaceColor={surfaceColor} textColor={textColor} />

      <PaymentFiltersBar
        filters={filters}
        onChange={updateFilters}
        onReset={clearModalFilters}
        filterLoading={listLoading}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        mutedColor={mutedColor}
      />

      <PaymentDataTable
        rows={rows}
        totals={totals}
        loading={listLoading}
        error={listError}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onRetry={loadList}
        onView={onView}
        onLibraryDetails={onLibraryDetails}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        mutedColor={mutedColor}
      />

      <PaymentViewModal
        visible={modalOpen}
        payment={selected}
        onClose={() => setModalOpen(false)}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        mutedColor={mutedColor}
      />
    </ScrollView>
  );
}

function makeStyles(backgroundColor: string) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: 56,
      maxWidth: Platform.OS === 'web' ? 1440 : undefined,
      alignSelf: Platform.OS === 'web' ? 'center' : undefined,
      width: '100%',
    },
    hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: '#4F46E5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: { fontSize: 10, fontWeight: '900', color: theme.colors.mutedText, letterSpacing: 1.2 },
    title: { fontSize: 26, fontWeight: '900', marginTop: 4 },
    sub: { fontSize: 13, fontWeight: '700', marginTop: 6, lineHeight: 18 },
    refreshBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    banner: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  });
}
