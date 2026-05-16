import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Crown, Gift, Minus, Search, Sparkles, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { theme } from '../../../theme';
import {
  DEFAULT_FILTER_SHEET,
  PAYMENT_STATUS_OPTIONS,
  PLAN_GRID_OPTIONS,
  type FilterSheetValues,
  type PaymentStatusFilter,
  type PlanTypeFilter,
} from './types';

type Props = {
  visible: boolean;
  values: FilterSheetValues;
  onClose: () => void;
  onApply: (values: FilterSheetValues) => void;
  onReset: () => void;
  loading?: boolean;
  title?: string;
  /** Show payment status chips (Payment Details page). */
  showPaymentStatus?: boolean;
  borderColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedColor?: string;
};

function PlanIcon({ icon, color }: { icon: (typeof PLAN_GRID_OPTIONS)[0]['icon']; color: string }) {
  const size = 22;
  if (icon === 'crown') return <Crown size={size} color={color} strokeWidth={2.2} />;
  if (icon === 'sparkles') return <Sparkles size={size} color={color} strokeWidth={2.2} />;
  if (icon === 'gift') return <Gift size={size} color={color} strokeWidth={2.2} />;
  return <Minus size={size} color={color} strokeWidth={2.2} />;
}

export function PlanFilterBottomSheet({
  visible,
  values,
  onClose,
  onApply,
  onReset,
  loading = false,
  title = 'Filters',
  showPaymentStatus = false,
  borderColor = theme.colors.border,
  surfaceColor = theme.colors.surface,
  textColor = theme.colors.text,
  mutedColor = theme.colors.mutedText,
}: Props) {
  const { width } = useWindowDimensions();
  const sheetMaxWidth = Math.min(width - 24, 520);
  const [draft, setDraft] = useState<FilterSheetValues>(values);

  useEffect(() => {
    if (visible) setDraft(values);
  }, [visible, values]);

  const patch = (p: Partial<FilterSheetValues>) => setDraft((d) => ({ ...d, ...p }));

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    const cleared = { ...DEFAULT_FILTER_SHEET, search: '' };
    setDraft(cleared);
    onReset();
    onClose();
  };

  const cardWidth = useMemo(() => (sheetMaxWidth - 40 - 12) / 2, [sheetMaxWidth]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters" />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(220)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheetWrap, { maxWidth: sheetMaxWidth }]}
        >
          <View style={[styles.sheet, { borderColor, backgroundColor: surfaceColor }]}>
            <View style={styles.handle} />

            <View style={styles.head}>
              <View>
                <Text style={[styles.kicker, { color: mutedColor }]}>SmartLibDesk</Text>
                <Text style={[styles.title, { color: textColor }]}>{title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor }]} hitSlop={12}>
                <X size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { borderColor, backgroundColor: withAlpha(surfaceColor, 0.6) }]}>
              <Search size={18} color={mutedColor} />
              <TextInput
                value={draft.search}
                onChangeText={(search) => patch({ search })}
                placeholder="Search library / owner / email"
                placeholderTextColor={mutedColor}
                style={[styles.searchInput, { color: textColor }]}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {draft.search.trim() ? (
                <TouchableOpacity onPress={() => patch({ search: '' })} hitSlop={10}>
                  <X size={16} color={mutedColor} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[styles.sectionLbl, { color: mutedColor }]}>Plan category</Text>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => patch({ planType: 'all' })}
              style={styles.allBtnWrap}
            >
              {draft.planType === 'all' ? (
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.allBtn, styles.allBtnActive]}
                >
                  <Text style={styles.allBtnTxtActive}>ALL</Text>
                  <View style={styles.allCheck}>
                    <Check size={14} color="#4F46E5" strokeWidth={3} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.allBtn, { borderColor, backgroundColor: withAlpha(mutedColor, 0.06) }]}>
                  <Text style={[styles.allBtnTxt, { color: textColor }]}>ALL</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.grid}>
              {PLAN_GRID_OPTIONS.map((opt) => {
                const selected = draft.planType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.88}
                    onPress={() => patch({ planType: opt.key as PlanTypeFilter })}
                    style={[
                      styles.gridCard,
                      { width: cardWidth, borderColor: selected ? opt.accent : borderColor },
                      selected && {
                        backgroundColor: withAlpha(opt.accent, 0.12),
                        shadowColor: opt.accent,
                        shadowOpacity: 0.35,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 6,
                      },
                    ]}
                  >
                    {selected ? (
                      <LinearGradient
                        colors={[withAlpha(opt.accent, 0.2), withAlpha(opt.accent, 0.05)]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    ) : null}
                    <View style={[styles.cardIcon, { backgroundColor: withAlpha(opt.accent, 0.14) }]}>
                      <PlanIcon icon={opt.icon} color={opt.accent} />
                    </View>
                    <Text style={[styles.cardLabel, { color: selected ? opt.accent : textColor }]}>{opt.label}</Text>
                    <Text style={[styles.cardSub, { color: mutedColor }]} numberOfLines={1}>
                      {opt.subtitle}
                    </Text>
                    {selected ? (
                      <View style={[styles.cardCheck, { backgroundColor: opt.accent }]}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {showPaymentStatus ? (
              <>
                <Text style={[styles.sectionLbl, { color: mutedColor, marginTop: 4 }]}>Payment status</Text>
                <View style={styles.statusRow}>
                  {PAYMENT_STATUS_OPTIONS.map((opt) => {
                    const active = (draft.paymentStatus || 'all') === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => patch({ paymentStatus: opt.key as PaymentStatusFilter })}
                        style={[
                          styles.statusChip,
                          { borderColor: active ? theme.colors.primary : borderColor },
                          active && { backgroundColor: withAlpha(theme.colors.primary, 0.1) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipTxt,
                            { color: active ? theme.colors.primary : mutedColor },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={[styles.loadingTxt, { color: mutedColor }]}>Applying filters…</Text>
              </View>
            ) : null}

            <View style={[styles.footer, { borderColor }]}>
              <TouchableOpacity onPress={handleReset} style={[styles.resetBtn, { borderColor }]} activeOpacity={0.88}>
                <Text style={[styles.resetTxt, { color: mutedColor }]}>Reset Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApply} style={styles.applyWrap} activeOpacity={0.9} disabled={loading}>
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyBtn}
                >
                  <Text style={styles.applyTxt}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith('rgba')) return color;
  const hex = color.replace('#', '').trim();
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.52)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } as object)
      : {}),
  },
  sheetWrap: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  sheet: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    overflow: 'hidden',
    ...theme.shadow.card,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 -8px 40px rgba(15,23,42,0.18)',
          backgroundColor: 'rgba(255,255,255,0.94)',
        } as object)
      : {}),
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.45)',
    marginTop: 10,
    marginBottom: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 50,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 12 },
  sectionLbl: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  allBtnWrap: { marginBottom: 14 },
  allBtn: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  allBtnActive: {
    borderWidth: 0,
  },
  allBtnTxt: { fontSize: 15, fontWeight: '900', letterSpacing: 1.2 },
  allBtnTxtActive: { fontSize: 15, fontWeight: '900', letterSpacing: 1.2, color: '#FFFFFF' },
  allCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  gridCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 108,
    overflow: 'hidden',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 0.6 },
  cardSub: { marginTop: 4, fontSize: 11, fontWeight: '600' },
  cardCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusChipTxt: { fontSize: 12, fontWeight: '800' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingTxt: { fontSize: 13, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetTxt: { fontSize: 14, fontWeight: '800' },
  applyWrap: { flex: 1.6 },
  applyBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyTxt: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
});
