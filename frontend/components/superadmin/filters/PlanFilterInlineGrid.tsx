import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PlanFilterGrid } from './PlanFilterGrid';
import { PAYMENT_STATUS_OPTIONS, type PaymentStatusFilter, type PlanTypeFilter } from './types';

type Props = {
  planType: PlanTypeFilter;
  onPlanTypeChange: (planType: PlanTypeFilter) => void;
  paymentStatus?: PaymentStatusFilter;
  onPaymentStatusChange?: (status: PaymentStatusFilter) => void;
  showPaymentStatus?: boolean;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  onReset?: () => void;
};

/** Inline wrapper — glass plan grid + optional payment status chips. */
export function PlanFilterInlineGrid({
  planType,
  onPlanTypeChange,
  paymentStatus = 'all',
  onPaymentStatusChange,
  showPaymentStatus = false,
  mutedColor,
  onReset,
}: Props) {
  return (
    <View style={styles.wrap}>
      <PlanFilterGrid selectedPlan={planType} onSelectPlan={onPlanTypeChange} showAllButton />

      {showPaymentStatus && onPaymentStatusChange ? (
        <>
          <Text style={[styles.sectionLbl, { color: mutedColor }]}>Payment status</Text>
          <View style={styles.statusRow}>
            {PAYMENT_STATUS_OPTIONS.map((opt) => {
              const active = paymentStatus === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => onPaymentStatusChange(opt.key)}
                  style={[styles.statusChip, active && styles.statusChipOn]}
                >
                  <Text style={[styles.statusChipTxt, { color: active ? '#A5B4FC' : mutedColor }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {onReset ? (
        <Text onPress={onReset} style={[styles.reset, { color: mutedColor }]}>
          Reset filters
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  sectionLbl: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  statusChipTxt: { fontSize: 12, fontWeight: '800' },
  statusChipOn: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: 'rgba(129,140,248,0.45)',
  },
  reset: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
});
