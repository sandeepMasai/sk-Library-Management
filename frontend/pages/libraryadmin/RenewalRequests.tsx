import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAppStore, type RenewalRequest, type FeeMethod, type FeeStatus } from '../../store';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { ConfirmModal } from '../../components/ConfirmModal';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

const FEE_OPTIONS: FeeStatus[] = ['Paid', 'Half Paid', 'Pending'];

export default function RenewalRequestsScreen() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const fetchLibraryRenewalRequests = useAppStore((s) => s.fetchLibraryRenewalRequests);
  const approveRenewalRequest = useAppStore((s) => s.approveRenewalRequest);
  const rejectRenewalRequest = useAppStore((s) => s.rejectRenewalRequest);
  const renewalRequests = useAppStore((s) => s.renewalRequests);
  const pendingRenewalCount = useAppStore((s) => s.pendingRenewalCount);

  const [filter, setFilter] = useState<FilterTab>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<RenewalRequest | null>(null);
  const [amount, setAmount] = useState('');
  const [feeStatus, setFeeStatus] = useState<FeeStatus>('Paid');
  const [feeMethod, setFeeMethod] = useState<FeeMethod>('cash');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<{ title: string; description?: string } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = useCallback(async () => {
    await fetchLibraryRenewalRequests(filter);
  }, [fetchLibraryRenewalRequests, filter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openApprove = (r: RenewalRequest) => {
    setSelected(r);
    setAmount(String(r.currentFeeAmount || ''));
    setFeeStatus('Paid');
    setFeeMethod('cash');
    setRejectOpen(false);
  };

  const onApprove = async () => {
    if (!selected) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      setModal({ title: 'Invalid amount', description: 'Enter a valid payment amount.' });
      return;
    }
    setActionLoading(true);
    const feeMap: Record<FeeStatus, string> = { Paid: 'paid', 'Half Paid': 'partial', Pending: 'pending' };
    const res = await approveRenewalRequest(selected.id, {
      amount: amt,
      feeStatus: feeMap[feeStatus],
      feeMethod,
    });
    setActionLoading(false);
    if (!res.ok) {
      setModal({ title: 'Failed', description: res.message });
      return;
    }
    setSelected(null);
    setModal({ title: 'Plan extended', description: 'Student membership and payment record updated.' });
    await load();
  };

  const onReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    const res = await rejectRenewalRequest(selected.id, rejectReason.trim() || undefined);
    setActionLoading(false);
    if (!res.ok) {
      setModal({ title: 'Failed', description: res.message });
      return;
    }
    setSelected(null);
    setRejectOpen(false);
    setRejectReason('');
    await load();
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: `Pending${filter === 'pending' ? ` (${pendingRenewalCount})` : ''}` },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  const renderItem = ({ item }: { item: RenewalRequest }) => {
    const isPending = item.status === 'pending';
    return (
      <View style={styles.card}>
        <View style={styles.cardBanner}>
          <Ionicons name="refresh-circle" size={18} color="#0F766E" />
          <Text style={styles.bannerTxt}>Student requested plan renewal</Text>
        </View>
        <Text style={styles.name}>{item.studentName}</Text>
        <Text style={styles.meta}>📱 {item.mobile}</Text>
        {item.seatNumber != null && <Text style={styles.meta}>Seat #{item.seatNumber}</Text>}
        <Text style={styles.meta}>
          Current expiry:{' '}
          {item.currentExpiryDate ? format(new Date(item.currentExpiryDate), 'dd MMM yyyy') : '—'}
        </Text>
        <Text style={styles.meta}>
          Requested: {item.requestedDurationLabel} · {item.requestedTiming}
        </Text>
        {item.createdAt && (
          <Text style={styles.metaLight}>
            {format(new Date(item.createdAt), 'dd MMM yyyy · h:mm a')}
          </Text>
        )}
        {item.note ? <Text style={styles.note}>"{item.note}"</Text> : null}
        {isPending ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => openApprove(item)}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.approveTxt}>Approve & Extend</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => {
                setSelected(item);
                setRejectOpen(true);
              }}
            >
              <Text style={styles.rejectTxt}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.statusPill, item.status === 'approved' ? styles.pillOk : styles.pillBad]}>
            <Text style={styles.statusPillTxt}>{item.status}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.tabs}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, filter === t.key && styles.tabActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[styles.tabTxt, filter === t.key && styles.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={renewalRequests}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={renewalRequests.length === 0 ? styles.emptyList : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={40} color={theme.colors.muted} />
              <Text style={styles.emptyTxt}>No {filter === 'all' ? '' : filter} requests</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!selected && !rejectOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Extend plan</Text>
            <Text style={styles.modalSub}>{selected?.studentName} · {selected?.requestedDurationLabel}</Text>
            <Text style={styles.hint}>
              If membership is active, new expiry extends from current date. If expired, starts from today.
            </Text>
            <Text style={styles.fieldLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={theme.colors.muted}
            />
            <Text style={styles.fieldLabel}>Student fee status (account)</Text>
            <Text style={styles.hint}>Payment history is always recorded as Paid when you approve.</Text>
            <View style={styles.chipRow}>
              {FEE_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, feeStatus === f && styles.chipActive]}
                  onPress={() => setFeeStatus(f)}
                >
                  <Text style={[styles.chipTxt, feeStatus === f && styles.chipTxtActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Payment method</Text>
            <View style={styles.chipRow}>
              {(['cash', 'upi'] as FeeMethod[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, feeMethod === m && styles.chipActive]}
                  onPress={() => setFeeMethod(m)}
                >
                  <Text style={[styles.chipTxt, feeMethod === m && styles.chipTxtActive]}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSelected(null)}>
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={onApprove} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmTxt}>Approve & Extend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={rejectOpen && !!selected} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Reject request</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              multiline
              placeholder="Reason (optional)"
              placeholderTextColor={theme.colors.muted}
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setRejectOpen(false);
                  setSelected(null);
                }}
              >
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: '#DC2626' }]} onPress={onReject} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmTxt}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!modal}
        title={modal?.title || ''}
        description={modal?.description}
        confirmText="OK"
        onConfirm={() => setModal(null)}
        onCancel={() => setModal(null)}
        tone="primary"
      />
    </SafeAreaView>
  );
}

function makeStyles(isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    tabTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.mutedText },
    tabTxtActive: { color: '#fff' },
    list: { padding: 16, paddingBottom: 32 },
    emptyList: { flexGrow: 1 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(13,148,136,0.22)' : '#F0FDFA',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(13,148,136,0.35)' : '#99F6E4',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    bannerTxt: { fontSize: 11, fontWeight: '800', color: isDark ? '#5EEAD4' : '#0F766E' },
    name: { fontSize: 17, fontWeight: '900', color: theme.colors.text },
    meta: { fontSize: 13, color: theme.colors.text, marginTop: 4 },
    metaLight: { fontSize: 11, color: theme.colors.mutedText, marginTop: 4 },
    note: { fontSize: 12, fontStyle: 'italic', color: theme.colors.mutedText, marginTop: 8 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    approveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#059669',
      borderRadius: 12,
      paddingVertical: 12,
    },
    approveTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
    rejectBtn: {
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239,68,68,0.35)' : '#FECACA',
      backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'transparent',
      justifyContent: 'center',
    },
    rejectTxt: { color: isDark ? '#F87171' : '#DC2626', fontWeight: '800', fontSize: 13 },
    statusPill: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    pillOk: { backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : '#ECFDF5' },
    pillBad: { backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : '#FEF2F2' },
    statusPillTxt: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize', color: theme.colors.text },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
    emptyTxt: { color: theme.colors.mutedText },
    modalBackdrop: { flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 24,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
    modalSub: { fontSize: 13, color: theme.colors.mutedText, marginTop: 4 },
    hint: { fontSize: 12, color: theme.colors.mutedText, marginTop: 10, lineHeight: 17 },
    fieldLabel: { fontSize: 12, fontWeight: '800', color: theme.colors.mutedText, marginTop: 14, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : theme.colors.background,
      borderRadius: 12,
      padding: 12,
      color: theme.colors.text,
      fontSize: 15,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: isDark ? 'rgba(13,148,136,0.22)' : '#F0FDFA',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    chipTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.mutedText },
    chipTxtActive: { color: theme.colors.primary },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    modalCancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalCancelTxt: { fontWeight: '700', color: theme.colors.text },
    modalConfirm: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: '#059669',
    },
    modalConfirmTxt: { color: '#fff', fontWeight: '800' },
  });
}
