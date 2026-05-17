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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAppStore, type RenewalRequest, type RenewContext } from '../../store';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { ConfirmModal } from '../../components/ConfirmModal';

const DURATIONS = [
  { days: 30 as const, label: '1 Month' },
  { days: 90 as const, label: '3 Months' },
  { days: 180 as const, label: '6 Months' },
  { days: 365 as const, label: '1 Year' },
];

function renewalStatusStyle(status: RenewalRequest['status'], isDark: boolean) {
  if (status === 'approved') {
    return isDark
      ? { bg: 'rgba(34,197,94,0.18)', fg: '#4ADE80', label: 'Approved' }
      : { bg: '#ECFDF5', fg: '#059669', label: 'Approved' };
  }
  if (status === 'rejected') {
    return isDark
      ? { bg: 'rgba(239,68,68,0.18)', fg: '#F87171', label: 'Rejected' }
      : { bg: '#FEF2F2', fg: '#DC2626', label: 'Rejected' };
  }
  return isDark
    ? { bg: 'rgba(245,158,11,0.18)', fg: '#FBBF24', label: 'Pending' }
    : { bg: '#FFFBEB', fg: '#D97706', label: 'Pending' };
}

export default function RenewPlanScreen() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const currentUser = useAppStore((s) => s.currentUser);
  const fetchRenewContext = useAppStore((s) => s.fetchRenewContext);
  const submitRenewalRequest = useAppStore((s) => s.submitRenewalRequest);
  const fetchMyRenewalRequests = useAppStore((s) => s.fetchMyRenewalRequests);
  const renewalRequests = useAppStore((s) => s.renewalRequests);

  const [context, setContext] = useState<RenewContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duration, setDuration] = useState<30 | 90 | 180 | 365>(30);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [modal, setModal] = useState<{ title: string; description?: string } | null>(null);

  const hasPending = renewalRequests.some((r) => r.status === 'pending');

  const load = useCallback(async () => {
    const [ctxRes, reqRes] = await Promise.all([fetchRenewContext(), fetchMyRenewalRequests()]);
    if (ctxRes.ok && ctxRes.context) {
      setContext(ctxRes.context);
      setShiftId((prev) => {
        if (prev) return prev;
        if (ctxRes.context!.currentShiftId) return ctxRes.context!.currentShiftId;
        if (ctxRes.context!.shifts[0]) return ctxRes.context!.shifts[0].id;
        return null;
      });
    }
    if (!reqRes.ok && reqRes.message) setModal({ title: 'Error', description: reqRes.message });
  }, [fetchRenewContext, fetchMyRenewalRequests]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const selectedShift = context?.shifts.find((s) => s.id === shiftId);

  const onSubmit = async () => {
    if (hasPending) {
      setModal({ title: 'Pending request', description: 'You already have a renewal request awaiting approval.' });
      return;
    }
    if (!selectedShift && !context?.currentTiming) {
      setModal({ title: 'Select timing', description: 'Please choose a shift/timing for your renewal.' });
      return;
    }
    setSubmitting(true);
    const res = await submitRenewalRequest({
      requestedDuration: duration,
      requestedShiftId: shiftId || undefined,
      requestedTiming: selectedShift?.name || context?.currentTiming,
      note: note.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      setModal({ title: 'Could not submit', description: res.message });
      return;
    }
    setNote('');
    setModal({ title: 'Request sent', description: 'Your librarian will review and approve your renewal soon.' });
    await fetchMyRenewalRequests();
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
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Renew / Extend Plan</Text>
          <Text style={styles.heroSub}>Send a request to your library. Seat and timing stay the same after approval.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your membership</Text>
          <Row styles={styles} label="Name" value={currentUser?.name || '—'} />
          <Row styles={styles} label="Mobile" value={currentUser?.mobile || '—'} />
          <Row
            styles={styles}
            label="Expires"
            value={
              currentUser?.expiryDate
                ? format(new Date(currentUser.expiryDate), 'dd MMM yyyy')
                : '—'
            }
          />
          {context?.seatNumber != null && <Row styles={styles} label="Seat" value={`#${context.seatNumber}`} />}
          <Row styles={styles} label="Current timing" value={context?.currentTiming || '—'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Requested duration</Text>
          <View style={styles.chipRow}>
            {DURATIONS.map((d) => {
              const active = duration === d.days;
              return (
                <TouchableOpacity
                  key={d.days}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDuration(d.days)}
                >
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {context && context.shifts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Requested timing</Text>
            <View style={styles.chipRow}>
              {context.shifts.map((s) => {
                const active = shiftId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setShiftId(s.id)}
                  >
                    <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{s.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Any message for the librarian…"
            placeholderTextColor={theme.colors.mutedText}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (submitting || hasPending) && styles.submitDisabled]}
          onPress={onSubmit}
          disabled={submitting || hasPending}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <Text style={styles.submitTxt}>{hasPending ? 'Request pending' : 'Send renewal request'}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Request history</Text>
        {renewalRequests.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={32} color={theme.colors.mutedText} />
            <Text style={styles.emptyTxt}>No requests yet</Text>
          </View>
        ) : (
          renewalRequests.map((r) => {
            const st = renewalStatusStyle(r.status, isDark);
            return (
              <View key={r.id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyDur}>{r.requestedDurationLabel}</Text>
                  <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusTxt, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.historyMeta}>Timing: {r.requestedTiming}</Text>
                {r.createdAt && (
                  <Text style={styles.historyMeta}>
                    Requested {format(new Date(r.createdAt), 'dd MMM yyyy · h:mm a')}
                  </Text>
                )}
                {r.status === 'approved' && r.newExpiryDate && (
                  <Text style={styles.historyOk}>New expiry: {format(new Date(r.newExpiryDate), 'dd MMM yyyy')}</Text>
                )}
                {r.status === 'rejected' && r.rejectReason && (
                  <Text style={styles.historyReject}>{r.rejectReason}</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

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

function Row({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function makeStyles(isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 32 },
    hero: { alignItems: 'center', marginBottom: 16, paddingTop: 4 },
    heroTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
    heroSub: {
      fontSize: 13,
      color: theme.colors.mutedText,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...(isDark ? {} : theme.shadow.card),
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.text,
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
    rowLabel: { fontSize: 13, color: theme.colors.mutedText, flexShrink: 0 },
    rowValue: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'right',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: isDark ? 'rgba(13,148,136,0.22)' : '#F0FDFA',
      borderColor: theme.colors.primary,
    },
    chipTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.mutedText },
    chipTxtActive: { color: theme.colors.primary },
    input: {
      minHeight: 88,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : theme.colors.background,
      padding: 12,
      color: theme.colors.text,
      textAlignVertical: 'top',
      fontSize: 14,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 4,
      marginBottom: 20,
    },
    submitDisabled: { opacity: 0.55 },
    submitTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.mutedText,
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    empty: { alignItems: 'center', padding: 24, gap: 8 },
    emptyTxt: { color: theme.colors.mutedText, fontSize: 14 },
    historyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    historyDur: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusTxt: { fontSize: 11, fontWeight: '800' },
    historyMeta: { fontSize: 12, color: theme.colors.mutedText, marginTop: 2 },
    historyOk: { fontSize: 12, color: theme.colors.success, fontWeight: '700', marginTop: 6 },
    historyReject: { fontSize: 12, color: theme.colors.danger, marginTop: 6 },
  });
}
