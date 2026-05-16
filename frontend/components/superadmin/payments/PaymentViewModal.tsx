import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../../../theme';
import { PaymentStatusBadge, SubscriptionChip } from './PaymentStatusBadge';
import type { PaymentRow } from './types';

type Props = {
  visible: boolean;
  payment: PaymentRow | null;
  onClose: () => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
};

function Row({ label, value, mutedColor, textColor }: { label: string; value: string; mutedColor: string; textColor: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.lbl, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.val, { color: textColor }]}>{value}</Text>
    </View>
  );
}

export function PaymentViewModal({ visible, payment, onClose, borderColor, surfaceColor, textColor, mutedColor }: Props) {
  if (!payment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { borderColor, backgroundColor: surfaceColor }]} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: textColor }]}>Payment details</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={22} color={textColor} />
            </Pressable>
          </View>
          <View style={styles.badges}>
            <PaymentStatusBadge status={payment.status} />
            <SubscriptionChip active={payment.subscriptionActive} />
          </View>
          <Row label="Library" value={payment.libraryName} mutedColor={mutedColor} textColor={textColor} />
          <Row label="Owner" value={payment.ownerName} mutedColor={mutedColor} textColor={textColor} />
          <Row label="Amount" value={`₹${payment.amount.toFixed(2)}`} mutedColor={mutedColor} textColor={textColor} />
          <Row label="Plan" value={payment.planName} mutedColor={mutedColor} textColor={textColor} />
          <Row label="Transaction ID" value={payment.transactionId} mutedColor={mutedColor} textColor={textColor} />
          <Row label="Razorpay ID" value={payment.razorpayPaymentId} mutedColor={mutedColor} textColor={textColor} />
          <Row
            label="Payment date"
            value={payment.paymentDate ? new Date(payment.paymentDate).toLocaleString('en-IN') : '—'}
            mutedColor={mutedColor}
            textColor={textColor}
          />
          <Row
            label="Expiry"
            value={payment.expiryDate ? new Date(payment.expiryDate).toLocaleDateString('en-IN') : '—'}
            mutedColor={mutedColor}
            textColor={textColor}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 48px rgba(15,23,42,0.18)' } : {}),
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900' },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  row: { marginBottom: 12 },
  lbl: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  val: { fontSize: 15, fontWeight: '800', marginTop: 4 },
});
