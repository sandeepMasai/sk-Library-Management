import React, { useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ban, Check, CreditCard, FileCheck, BadgeCheck } from 'lucide-react-native';
import type { PlanTypeFilter } from './types';

type CategoryKey = Exclude<PlanTypeFilter, 'all'>;

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: 'free' | 'pro' | 'trial' | 'none';
  glow: string;
  gradient: [string, string];
}[] = [
  { key: 'free', label: 'FREE', icon: 'free', glow: 'rgba(148,163,184,0.35)', gradient: ['#64748B', '#94A3B8'] },
  { key: 'pro', label: 'PRO', icon: 'pro', glow: 'rgba(99,102,241,0.5)', gradient: ['#6366F1', '#22D3EE'] },
  { key: 'trial', label: 'TRIAL', icon: 'trial', glow: 'rgba(245,158,11,0.45)', gradient: ['#F59E0B', '#FBBF24'] },
  { key: 'none', label: 'NONE', icon: 'none', glow: 'rgba(239,68,68,0.35)', gradient: ['#EF4444', '#F87171'] },
];

type Props = {
  onSelect: (planType: PlanTypeFilter) => void;
  selectedKey?: PlanTypeFilter | null;
  maxWidth?: number;
};

function CategoryIcon({ type, color }: { type: (typeof CATEGORIES)[0]['icon']; color: string }) {
  const size = 36;
  const stroke = 2;
  if (type === 'free') return <FileCheck size={size} color={color} strokeWidth={stroke} />;
  if (type === 'pro') return <BadgeCheck size={size} color={color} strokeWidth={stroke} />;
  if (type === 'trial') return <CreditCard size={size} color={color} strokeWidth={stroke} />;
  return <Ban size={size} color={color} strokeWidth={stroke} />;
}

export function PlanCategoryFilterGrid({ onSelect, selectedKey = null, maxWidth = 420 }: Props) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width - 32, maxWidth);
  const gap = 14;
  const cardSize = Math.floor((panelWidth - gap) / 2);

  const styles = useMemo(() => makeStyles(cardSize), [cardSize]);

  return (
    <View style={[styles.panel, { width: panelWidth }]}>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => {
          const selected = selectedKey === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              activeOpacity={0.85}
              onPress={() => onSelect(cat.key)}
              style={styles.cardOuter}
            >
              {selected ? (
                <LinearGradient
                  colors={['#6366F1', '#22D3EE', '#A78BFA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradientBorder}
                >
                  <View style={[styles.cardInner, styles.cardInnerSelected]}>
                    <CardContent cat={cat} selected styles={styles} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.cardInner, styles.cardInnerDefault]}>
                  <CardContent cat={cat} selected={false} styles={styles} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function CardContent({
  cat,
  selected,
  styles,
}: {
  cat: (typeof CATEGORIES)[0];
  selected: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <>
      {selected ? (
        <View style={[styles.selectedBadge, { backgroundColor: cat.gradient[0] }]}>
          <Check size={11} color="#FFFFFF" strokeWidth={3} />
        </View>
      ) : null}

      <View style={[styles.iconGlow, { shadowColor: cat.glow }]}>
        <LinearGradient
          colors={
            selected
              ? [withAlpha(cat.gradient[0], 0.35), withAlpha(cat.gradient[1], 0.12)]
              : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']
          }
          style={styles.iconCircle}
        >
          <CategoryIcon type={cat.icon} color={selected ? '#E0E7FF' : '#94A3B8'} />
        </LinearGradient>
      </View>

      <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>{cat.label}</Text>
    </>
  );
}

function withAlpha(hex: string, alpha: number) {
  if (hex.startsWith('rgba')) return hex;
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function makeStyles(cardSize: number) {
  return StyleSheet.create({
    panel: {
      alignSelf: 'center',
      backgroundColor: '#0F1419',
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.12)',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          } as object)
        : {
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }),
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      justifyContent: 'center',
    },
    cardOuter: {
      width: cardSize,
      height: cardSize,
      borderRadius: 22,
    },
    cardGradientBorder: {
      flex: 1,
      borderRadius: 22,
      padding: 2,
    },
    cardInner: {
      flex: 1,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 10,
      overflow: 'hidden',
    },
    cardInnerDefault: {
      backgroundColor: 'rgba(30,36,48,0.95)',
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.14)',
    },
    cardInnerSelected: {
      backgroundColor: 'rgba(22,28,40,0.98)',
    },
    selectedBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    iconGlow: {
      marginBottom: 14,
      shadowOpacity: 0.9,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    cardLabel: {
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: 'rgba(226,232,240,0.75)',
      textAlign: 'center',
    },
    cardLabelSelected: {
      color: '#F8FAFC',
    },
  });
}
