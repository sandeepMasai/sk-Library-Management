import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { theme } from '../../../theme';
import { PlanFilterInlineGrid } from './PlanFilterInlineGrid';
import { PAYMENT_STATUS_OPTIONS, type FilterSheetValues, PaymentStatusFilter, PlanTypeFilter } from './types';

type Props = {
  values: FilterSheetValues;
  onSearchChange: (search: string) => void;
  onPlanTypeChange: (planType: PlanTypeFilter) => void;
  onPaymentStatusChange?: (status: PaymentStatusFilter) => void;
  onReset: () => void;
  filterLoading?: boolean;
  showPaymentStatus?: boolean;
  /** Dark ALL/FREE/PRO/TRIAL/NONE grid — hidden on Payment Details (use PaymentPlanStatsGrid instead). */
  showPlanGrid?: boolean;
  searchPlaceholder?: string;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
};

export function FilterSearchBar({
  values,
  onSearchChange,
  onPlanTypeChange,
  onPaymentStatusChange,
  onReset,
  filterLoading = false,
  showPaymentStatus = false,
  showPlanGrid = false,
  searchPlaceholder = 'Search library / owner / email',
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
}: Props) {
  return (
    <View style={[styles.wrap, { borderColor, backgroundColor: surfaceColor }]}>
      <View style={[styles.searchBox, { borderColor }]}>
        <Search size={18} color={mutedColor} />
        <TextInput
          value={values.search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={mutedColor}
          style={[styles.searchInput, { color: textColor }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {values.search.trim() ? (
          <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={10}>
            <X size={16} color={mutedColor} />
          </TouchableOpacity>
        ) : null}
        {filterLoading ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 4 }} /> : null}
      </View>

      {showPlanGrid ? (
        <PlanFilterInlineGrid
          planType={values.planType}
          onPlanTypeChange={onPlanTypeChange}
          paymentStatus={values.paymentStatus}
          onPaymentStatusChange={onPaymentStatusChange}
          showPaymentStatus={showPaymentStatus}
          borderColor={borderColor}
          textColor={textColor}
          mutedColor={mutedColor}
          onReset={onReset}
        />
      ) : showPaymentStatus && onPaymentStatusChange ? (
        <>
          <Text style={[styles.sectionLbl, { color: mutedColor }]}>Payment status</Text>
          <View style={styles.statusRow}>
            {PAYMENT_STATUS_OPTIONS.map((opt) => {
              const active = (values.paymentStatus || 'all') === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => onPaymentStatusChange(opt.key)}
                  style={[styles.statusChip, active && styles.statusChipOn]}
                >
                  <Text style={[styles.statusChipTxt, { color: active ? '#6366F1' : mutedColor }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={onReset}>
            <Text style={[styles.reset, { color: mutedColor }]}>Reset filters</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginTop: 10,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
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
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(148,163,184,0.06)',
  },
  statusChipOn: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderColor: 'rgba(99,102,241,0.35)',
  },
  statusChipTxt: { fontSize: 12, fontWeight: '800' },
  reset: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
});
