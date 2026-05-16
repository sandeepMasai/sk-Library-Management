import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { theme } from '../../../theme';
import { PlanFilterInlineGrid } from './PlanFilterInlineGrid';
import type { FilterSheetValues, PaymentStatusFilter, PlanTypeFilter } from './types';

type Props = {
  values: FilterSheetValues;
  onSearchChange: (search: string) => void;
  onPlanTypeChange: (planType: PlanTypeFilter) => void;
  onPaymentStatusChange?: (status: PaymentStatusFilter) => void;
  onReset: () => void;
  filterLoading?: boolean;
  showPaymentStatus?: boolean;
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
});
