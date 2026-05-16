import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  paid: { bg: 'rgba(34,197,94,0.14)', text: '#15803D', label: 'Success' },
  pending: { bg: 'rgba(245,158,11,0.16)', text: '#B45309', label: 'Pending' },
  failed: { bg: 'rgba(239,68,68,0.14)', text: '#B91C1C', label: 'Failed' },
  refunded: { bg: 'rgba(99,102,241,0.14)', text: '#4338CA', label: 'Refunded' },
  cancelled: { bg: 'rgba(100,116,139,0.16)', text: '#475569', label: 'Cancelled' },
  expired: { bg: 'rgba(148,163,184,0.2)', text: '#64748B', label: 'Expired' },
};

type Props = {
  status: string;
  compact?: boolean;
};

export function PaymentStatusBadge({ status, compact }: Props) {
  const key = String(status || '').toLowerCase();
  const style = STATUS_STYLES[key] || STATUS_STYLES.pending;

  return (
    <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: style.bg }]}>
      <Text style={[styles.txt, compact && styles.txtCompact, { color: style.text }]}>{style.label}</Text>
    </View>
  );
}

export function SubscriptionChip({ active }: { active: boolean }) {
  return (
    <View style={[styles.chip, active ? styles.chipActive : styles.chipExpired]}>
      <Text style={[styles.chipTxt, active ? styles.chipActiveTxt : styles.chipExpiredTxt]}>
        {active ? 'Active' : 'Expired'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeCompact: { paddingHorizontal: 8, paddingVertical: 3 },
  txt: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  txtCompact: { fontSize: 10 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  chipActive: { backgroundColor: 'rgba(34,197,94,0.12)' },
  chipExpired: { backgroundColor: 'rgba(148,163,184,0.16)' },
  chipTxt: { fontSize: 10, fontWeight: '900' },
  chipActiveTxt: { color: '#15803D' },
  chipExpiredTxt: { color: '#64748B' },
});
