import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../../../theme';
import type { PaymentFilters } from './types';
import { DEFAULT_PAYMENT_FILTERS } from './types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'paid', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const PLAN_OPTIONS = [
  { value: 'all', label: 'All plans' },
  { value: 'trial', label: 'Trial' },
  { value: 'monthly', label: 'Monthly' },
  { value: '6month', label: '6-Month' },
  { value: 'yearly', label: 'Yearly' },
];

const LIB_STATUS = [
  { value: 'all', label: 'All libraries' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

type Props = {
  visible: boolean;
  filters: PaymentFilters;
  onClose: () => void;
  onApply: (filters: PaymentFilters) => void;
  onClear: () => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
};

function ChipRow({
  label,
  options,
  value,
  onSelect,
  borderColor,
  textColor,
  mutedColor,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  borderColor: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.chipRow}>
      <Text style={[styles.chipLabel, { color: mutedColor }]}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onSelect(o.value)}
              style={[styles.chip, { borderColor }, active && styles.chipActive]}
            >
              <Text style={[styles.chipTxt, { color: active ? theme.colors.primary : textColor }]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function PaymentFilterModal({
  visible,
  filters,
  onClose,
  onApply,
  onClear,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
}: Props) {
  const [draft, setDraft] = useState<PaymentFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const patch = (p: Partial<PaymentFilters>) => setDraft((d) => ({ ...d, ...p }));

  const handleApply = () => {
    onApply({ ...draft, search: filters.search });
    onClose();
  };

  const handleClear = () => {
    const cleared = { ...DEFAULT_PAYMENT_FILTERS, search: filters.search };
    setDraft(cleared);
    onClear();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { borderColor, backgroundColor: surfaceColor }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={styles.head}>
            <View>
              <Text style={[styles.kicker, { color: mutedColor }]}>filters</Text>
              <Text style={[styles.title, { color: textColor }]}>Filter payments</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={[styles.closeBtn, { borderColor }]}>
              <X size={20} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <ChipRow
              label="Payment status"
              options={STATUS_OPTIONS}
              value={draft.paymentStatus}
              onSelect={(paymentStatus) =>
                patch({ paymentStatus: paymentStatus as PaymentFilters['paymentStatus'] })
              }
              borderColor={borderColor}
              textColor={textColor}
              mutedColor={mutedColor}
            />
            <ChipRow
              label="Plan type"
              options={PLAN_OPTIONS}
              value={draft.planType}
              onSelect={(planType) => patch({ planType: planType as PaymentFilters['planType'] })}
              borderColor={borderColor}
              textColor={textColor}
              mutedColor={mutedColor}
            />
            <ChipRow
              label="Library subscription"
              options={LIB_STATUS}
              value={draft.libraryStatus}
              onSelect={(libraryStatus) => patch({ libraryStatus })}
              borderColor={borderColor}
              textColor={textColor}
              mutedColor={mutedColor}
            />

            <View style={styles.dateRow}>
              <Text style={[styles.chipLabel, { color: mutedColor }]}>Date range</Text>
              <View style={styles.dateInputs}>
                <TextInput
                  value={draft.from}
                  onChangeText={(from) => patch({ from })}
                  placeholder="From"
                  placeholderTextColor={mutedColor}
                  style={[styles.dateInput, { borderColor, color: textColor }]}
                  {...(Platform.OS === 'web' ? ({ type: 'date' } as object) : {})}
                />
                <Text style={{ color: mutedColor, fontWeight: '800' }}>→</Text>
                <TextInput
                  value={draft.to}
                  onChangeText={(to) => patch({ to })}
                  placeholder="To"
                  placeholderTextColor={mutedColor}
                  style={[styles.dateInput, { borderColor, color: textColor }]}
                  {...(Platform.OS === 'web' ? ({ type: 'date' } as object) : {})}
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderColor }]}>
            <TouchableOpacity onPress={handleClear} style={[styles.clearBtn, { borderColor }]}>
              <Text style={[styles.clearTxt, { color: mutedColor }]}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApply} style={styles.applyBtn}>
              <Text style={styles.applyTxt}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    ...(Platform.OS === 'web'
      ? { maxWidth: 520, width: '100%', alignSelf: 'center', borderRadius: 24, marginBottom: 24 }
      : {}),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, maxHeight: 420 },
  chipRow: { marginBottom: 16 },
  chipLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: 'rgba(79,70,229,0.08)', borderColor: 'rgba(79,70,229,0.35)' },
  chipTxt: { fontSize: 12, fontWeight: '800' },
  dateRow: { marginBottom: 8 },
  dateInputs: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  dateInput: {
    flex: 1,
    minWidth: 130,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 8,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearTxt: { fontSize: 14, fontWeight: '800' },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  applyTxt: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
});
