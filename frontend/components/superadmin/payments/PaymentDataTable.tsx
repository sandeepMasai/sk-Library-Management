import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Building2, Download, Eye, Mail, MoreHorizontal, RefreshCw } from 'lucide-react-native';
import { theme } from '../../../theme';
import { PaymentStatusBadge, SubscriptionChip } from './PaymentStatusBadge';
import { downloadPaymentInvoice, resendPaymentInvoice } from './paymentInvoice';
import type { PaymentRow, PaymentsTotals } from './types';

type Props = {
  rows: PaymentRow[];
  totals: PaymentsTotals | null;
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  onPageChange: (p: number) => void;
  onRetry: () => void;
  onView: (row: PaymentRow) => void;
  onLibraryDetails: (row: PaymentRow) => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
};

const COLS = [
  'Library',
  'Owner',
  'Mobile',
  'Email',
  'Txn ID',
  'Razorpay ID',
  'Amount',
  'Plan',
  'Status',
  'Paid',
  'Expiry',
  'Sub',
  '',
] as const;

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtINR(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function RowActions({
  row,
  onView,
  onLibraryDetails,
  borderColor,
  textColor,
}: {
  row: PaymentRow;
  onView: (r: PaymentRow) => void;
  onLibraryDetails: (r: PaymentRow) => void;
  borderColor: string;
  textColor: string;
}) {
  return (
    <View style={styles.actions}>
      <TouchableOpacity onPress={() => onView(row)} style={[styles.actionBtn, { borderColor }]} accessibilityLabel="View payment">
        <Eye size={14} color={theme.colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => downloadPaymentInvoice(row)}
        style={[styles.actionBtn, { borderColor }]}
        accessibilityLabel="Download invoice"
      >
        <Download size={14} color={textColor} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => resendPaymentInvoice(row)}
        style={[styles.actionBtn, { borderColor }]}
        accessibilityLabel="Resend invoice"
      >
        <Mail size={14} color={textColor} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onLibraryDetails(row)} style={[styles.actionBtn, { borderColor }]}>
        <Building2 size={14} color={textColor} />
      </TouchableOpacity>
    </View>
  );
}

function MobileCard({
  row,
  onView,
  onLibraryDetails,
  borderColor,
  textColor,
  mutedColor,
}: {
  row: PaymentRow;
  onView: (r: PaymentRow) => void;
  onLibraryDetails: (r: PaymentRow) => void;
  borderColor: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={[styles.mobileCard, { borderColor, backgroundColor: theme.colors.surface }]}>
      <View style={styles.mobileHead}>
        <Text style={[styles.libName, { color: textColor }]}>{row.libraryName}</Text>
        <PaymentStatusBadge status={row.status} compact />
      </View>
      <Text style={{ color: mutedColor, fontWeight: '700', fontSize: 12 }}>{row.ownerName} · {row.mobile}</Text>
      <Text style={{ color: mutedColor, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
        {row.email}
      </Text>
      <View style={styles.mobileMeta}>
        <Text style={[styles.amount, { color: textColor }]}>{fmtINR(row.amount)}</Text>
        <Text style={{ color: mutedColor, fontWeight: '800', fontSize: 12 }}>{row.planName}</Text>
        <SubscriptionChip active={row.subscriptionActive} />
      </View>
      <Text style={{ color: mutedColor, fontSize: 10, marginTop: 6 }} numberOfLines={1}>
        {row.transactionId}
      </Text>
      <View style={{ marginTop: 10 }}>
        <RowActions row={row} onView={onView} onLibraryDetails={onLibraryDetails} borderColor={borderColor} textColor={textColor} />
      </View>
    </View>
  );
}

export function PaymentDataTable({
  rows,
  totals,
  loading,
  error,
  page,
  limit,
  total,
  onPageChange,
  onRetry,
  onView,
  onLibraryDetails,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
}: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 900;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (loading) {
    return (
      <View style={[styles.wrap, { borderColor, backgroundColor: surfaceColor }]}>
        <ActivityIndicator color={theme.colors.primary} style={{ padding: 40 }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.wrap, styles.center, { borderColor, backgroundColor: surfaceColor }]}>
        <Text style={{ color: theme.colors.danger, fontWeight: '800', marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity onPress={onRetry} style={[styles.retry, { borderColor }]}>
          <RefreshCw size={14} color={textColor} />
          <Text style={{ color: textColor, fontWeight: '800', marginLeft: 6 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!rows.length) {
    return (
      <View style={[styles.wrap, styles.center, { borderColor, backgroundColor: surfaceColor }]}>
        <MoreHorizontal size={32} color={mutedColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>No payments found</Text>
        <Text style={{ color: mutedColor, fontWeight: '700', textAlign: 'center', marginTop: 6 }}>
          Adjust filters or search to see transactions across libraries.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor, backgroundColor: surfaceColor }]}>
      {isMobile ? (
        <View style={{ padding: 12, gap: 10 }}>
          {rows.map((row) => (
            <MobileCard
              key={row.id}
              row={row}
              onView={onView}
              onLibraryDetails={onLibraryDetails}
              borderColor={borderColor}
              textColor={textColor}
              mutedColor={mutedColor}
            />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
          <View>
            <View style={[styles.thead, { borderColor, backgroundColor: surfaceColor }]}>
              {COLS.map((c) => (
                <Text key={c || 'actions'} style={[styles.th, { color: mutedColor }]}>
                  {c}
                </Text>
              ))}
            </View>
            {rows.map((row) => (
              <View key={row.id} style={[styles.tr, { borderColor }]}>
                <Text style={[styles.td, styles.tdWide, { color: textColor }]} numberOfLines={1}>
                  {row.libraryName}
                </Text>
                <Text style={[styles.td, { color: textColor }]} numberOfLines={1}>
                  {row.ownerName}
                </Text>
                <Text style={[styles.td, { color: mutedColor }]}>{row.mobile}</Text>
                <Text style={[styles.td, styles.tdWide, { color: mutedColor }]} numberOfLines={1}>
                  {row.email}
                </Text>
                <Text style={[styles.td, styles.tdMono, { color: mutedColor }]} numberOfLines={1}>
                  {row.transactionId}
                </Text>
                <Text style={[styles.td, styles.tdMono, { color: mutedColor }]} numberOfLines={1}>
                  {row.razorpayPaymentId}
                </Text>
                <Text style={[styles.td, { color: textColor, fontWeight: '900' }]}>{fmtINR(row.amount)}</Text>
                <Text style={[styles.td, { color: mutedColor }]}>{row.planName}</Text>
                <View style={styles.td}>
                  <PaymentStatusBadge status={row.status} compact />
                </View>
                <Text style={[styles.td, { color: mutedColor }]}>{fmtDate(row.paymentDate)}</Text>
                <Text style={[styles.td, { color: mutedColor }]}>{fmtDate(row.expiryDate)}</Text>
                <View style={styles.td}>
                  <SubscriptionChip active={row.subscriptionActive} />
                </View>
                <View style={[styles.td, styles.tdActions]}>
                  <RowActions row={row} onView={onView} onLibraryDetails={onLibraryDetails} borderColor={borderColor} textColor={textColor} />
                </View>
              </View>
            ))}
            {totals ? (
              <View style={[styles.tfoot, { borderColor, backgroundColor: 'rgba(79,70,229,0.06)' }]}>
                <Text style={[styles.tfootLbl, { color: textColor }]}>Page totals</Text>
                <Text style={[styles.tfootVal, { color: textColor }]}>{fmtINR(totals.totalRevenue)}</Text>
                <Text style={[styles.tfootVal, { color: theme.colors.success }]}>{totals.successCount} success</Text>
                <Text style={[styles.tfootVal, { color: '#B45309' }]}>
                  {fmtINR(totals.pendingTotal)} pending
                </Text>
                <Text style={[styles.tfootVal, { color: theme.colors.danger }]}>{fmtINR(totals.failedTotal)} failed</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <View style={[styles.pagination, { borderColor }]}>
        <Text style={{ color: mutedColor, fontWeight: '700', fontSize: 12 }}>
          {total} payments · page {page} of {totalPages}
        </Text>
        <View style={styles.pageBtns}>
          <TouchableOpacity
            disabled={!canPrev}
            onPress={() => onPageChange(page - 1)}
            style={[styles.pageBtn, { borderColor, opacity: canPrev ? 1 : 0.4 }]}
          >
            <Text style={{ color: textColor, fontWeight: '800' }}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!canNext}
            onPress={() => onPageChange(page + 1)}
            style={[styles.pageBtn, { borderColor, opacity: canNext ? 1 : 0.4 }]}
          >
            <Text style={{ color: textColor, fontWeight: '800' }}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 12 },
  thead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' ? ({ position: 'sticky' as const, top: 0, zIndex: 2 } as object) : {}),
  },
  th: {
    width: 100,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 6,
  },
  tr: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  td: { width: 100, fontSize: 12, fontWeight: '700', paddingHorizontal: 6 },
  tdWide: { width: 120 },
  tdMono: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  tdActions: { width: 140 },
  tfoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 14,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  tfootLbl: { fontWeight: '900', fontSize: 12, marginRight: 8 },
  tfootVal: { fontWeight: '800', fontSize: 13 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 10,
  },
  pageBtns: { flexDirection: 'row', gap: 8 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  mobileCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  mobileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  libName: { fontSize: 16, fontWeight: '900', flex: 1, marginRight: 8 },
  mobileMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  amount: { fontSize: 18, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.02)',
  },
});
