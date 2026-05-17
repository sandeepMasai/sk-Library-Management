import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { apiGet, type ApiError } from '../../services/api';
import { useAppStore, type StudentPaymentRecord } from '../../store';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { normalizePaymentStatus, paymentStatusLabel, paymentStatusTone } from '../../utils/paymentStatus';

type InvoicePayload = StudentPaymentRecord & {
  library?: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    phone?: string | null;
  } | null;
};

export default function PaymentHistoryScreen() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const fetchMyStudentPayments = useAppStore((s) => s.fetchMyStudentPayments);
  const payments = useAppStore((s) => s.studentPayments);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoice, setInvoice] = useState<InvoicePayload | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const load = useCallback(async () => {
    await fetchMyStudentPayments();
  }, [fetchMyStudentPayments]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openInvoice = async (id: string) => {
    setInvoiceLoading(true);
    try {
      const res = await apiGet<{ ok: boolean; invoice: InvoicePayload }>(`/api/student/payments/${id}/invoice`);
      setInvoice(res.invoice);
    } catch (e) {
      const err = e as ApiError;
      setInvoice({
        ...payments.find((p) => p.id === id)!,
        library: null,
      });
      if (!payments.find((p) => p.id === id)) {
        console.warn(err?.message);
      }
    } finally {
      setInvoiceLoading(false);
    }
  };

  const renderItem = ({ item }: { item: StudentPaymentRecord }) => {
    const statusKey = normalizePaymentStatus(item.status, {
      renewalRequestId: item.renewalRequestId,
    });
    const tone = paymentStatusTone(statusKey);
    const badgeStyle =
      tone === 'paid'
        ? styles.badgePaid
        : tone === 'partial'
          ? styles.badgePartial
          : tone === 'pending'
            ? styles.badgePending
            : styles.badgeOther;
    const badgeTxtStyle =
      tone === 'paid'
        ? styles.badgeTxtPaid
        : tone === 'partial'
          ? styles.badgeTxtPartial
          : tone === 'pending'
            ? styles.badgeTxtPending
            : styles.badgeTxtOther;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openInvoice(item.id)} activeOpacity={0.85}>
        <View style={styles.cardLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="receipt-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.amount}>₹{item.amount}</Text>
            <Text style={styles.sub}>{item.durationLabel} · {item.timing || 'Membership'}</Text>
            <Text style={styles.date}>
              {item.paymentDate ? format(new Date(item.paymentDate), 'dd MMM yyyy') : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeTxt, badgeTxtStyle]}>
              {paymentStatusLabel(item.status, { renewalRequestId: item.renewalRequestId })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedText} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={payments}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={payments.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={40} color={theme.colors.mutedText} />
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptySub}>Approved renewals will appear here with invoices.</Text>
          </View>
        }
      />

      <Modal visible={!!invoice || invoiceLoading} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {invoiceLoading ? (
              <ActivityIndicator style={{ margin: 40 }} color={theme.colors.primary} />
            ) : invoice ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.invoiceHead}>
                  <Text style={styles.invoiceTitle}>Invoice</Text>
                  <Text style={styles.invoiceNo}>{invoice.invoiceNumber}</Text>
                </View>
                {invoice.library?.name && (
                  <Text style={styles.libName}>{invoice.library.name}</Text>
                )}
                <View style={styles.invoiceDivider} />
                <InvoiceRow styles={styles} label="Student" value={invoice.studentName} />
                <InvoiceRow styles={styles} label="Amount" value={`₹${invoice.amount}`} />
                <InvoiceRow styles={styles} label="Duration" value={invoice.durationLabel} />
                <InvoiceRow styles={styles} label="Timing" value={invoice.timing || '—'} />
                {invoice.seatNumber != null && (
                  <InvoiceRow styles={styles} label="Seat" value={`#${invoice.seatNumber}`} />
                )}
                <InvoiceRow
                  styles={styles}
                  label="Payment date"
                  value={invoice.paymentDate ? format(new Date(invoice.paymentDate), 'dd MMM yyyy') : '—'}
                />
                <InvoiceRow
                  styles={styles}
                  label="Valid from"
                  value={invoice.startDate ? format(new Date(invoice.startDate), 'dd MMM yyyy') : '—'}
                />
                <InvoiceRow
                  styles={styles}
                  label="Valid until"
                  value={invoice.expiryDate ? format(new Date(invoice.expiryDate), 'dd MMM yyyy') : '—'}
                />
                <InvoiceRow
                  styles={styles}
                  label="Status"
                  value={paymentStatusLabel(invoice.status, {
                    renewalRequestId: invoice.renewalRequestId,
                  })}
                />
                {invoice.note ? <InvoiceRow styles={styles} label="Note" value={invoice.note} /> : null}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setInvoice(null)}>
                  <Text style={styles.closeBtnTxt}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InvoiceRow({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.invoiceRow}>
      <Text style={styles.invoiceLabel}>{label}</Text>
      <Text style={styles.invoiceValue}>{value}</Text>
    </View>
  );
}

function makeStyles(isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16, paddingBottom: 32 },
    emptyList: { flexGrow: 1 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(13,148,136,0.22)' : '#F0FDFA',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(13,148,136,0.35)' : '#99F6E4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    amount: { fontSize: 17, fontWeight: '900', color: theme.colors.text },
    sub: { fontSize: 12, color: theme.colors.mutedText, marginTop: 2 },
    date: { fontSize: 11, color: theme.colors.mutedText, marginTop: 4 },
    right: { alignItems: 'flex-end', gap: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    badgePaid: { backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : '#ECFDF5' },
    badgePartial: { backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#FFFBEB' },
    badgePending: { backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : '#FEF2F2' },
    badgeOther: { backgroundColor: isDark ? 'rgba(148,163,184,0.18)' : '#F1F5F9' },
    badgeTxt: { fontSize: 10, fontWeight: '800' },
    badgeTxtPaid: { color: isDark ? '#4ADE80' : '#059669' },
    badgeTxtPartial: { color: isDark ? '#FBBF24' : '#D97706' },
    badgeTxtPending: { color: isDark ? '#F87171' : '#DC2626' },
    badgeTxtOther: { color: theme.colors.mutedText },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    emptySub: { fontSize: 13, color: theme.colors.mutedText, textAlign: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '88%',
      padding: 20,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
    },
    invoiceHead: { alignItems: 'center', marginBottom: 8 },
    invoiceTitle: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
    invoiceNo: { fontSize: 12, color: theme.colors.mutedText, marginTop: 4 },
    libName: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    invoiceDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
    invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
    invoiceLabel: { fontSize: 13, color: theme.colors.mutedText, flexShrink: 0 },
    invoiceValue: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'right',
    },
    closeBtn: {
      marginTop: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    closeBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  });
}
