import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { PlanFilterCard } from './PlanFilterCard';
import { PLAN_FILTER_CARDS } from './planFilterConfig';
import type { PlanTypeFilter } from './types';

const GRID_GAP = 12;
const PANEL_PAD = 16;

type Props = {
  selectedPlan: PlanTypeFilter;
  onSelectPlan: (plan: PlanTypeFilter) => void;
  mode?: 'filter' | 'navigate';
  showAllButton?: boolean;
  maxWidth?: number;
};

/**
 * Premium 2×2 glass plan grid — explicit rows (FREE|PRO / TRIAL|NONE).
 */
export function PlanFilterGrid({
  selectedPlan,
  onSelectPlan,
  mode = 'filter',
  showAllButton = true,
  maxWidth = 440,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const panelWidth = Math.min(screenW - 32, maxWidth);
  const contentWidth = panelWidth - PANEL_PAD * 2;
  const cardWidth = Math.floor((contentWidth - GRID_GAP) / 2);

  const styles = useMemo(() => makeStyles(panelWidth, cardWidth), [panelWidth, cardWidth]);
  const showSelection = mode === 'filter';
  const allSelected = showSelection && selectedPlan === 'all';

  const row1 = PLAN_FILTER_CARDS.slice(0, 2);
  const row2 = PLAN_FILTER_CARDS.slice(2, 4);

  const renderCard = (cfg: (typeof PLAN_FILTER_CARDS)[0]) => (
    <View key={cfg.key} style={styles.cell}>
      <PlanFilterCard
        config={cfg}
        selected={showSelection && selectedPlan === cfg.key}
        width={cardWidth}
        onPress={() => onSelectPlan(cfg.key)}
      />
    </View>
  );

  return (
    <View style={styles.panel}>
      {showAllButton ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onSelectPlan('all')} style={styles.allWrap}>
          {allSelected ? (
            <LinearGradient
              colors={['#6366F1', '#22D3EE', '#818CF8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.allBtn}
            >
              <Text style={styles.allTxt}>ALL</Text>
              <View style={styles.allCheck}>
                <Check size={12} color="#6366F1" strokeWidth={3} />
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.allBtnMuted}>
              <Text style={styles.allTxtMuted}>ALL</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}

      <View style={styles.grid}>
        <View style={[styles.row, styles.rowGap]}>{row1.map(renderCard)}</View>
        <View style={styles.row}>{row2.map(renderCard)}</View>
      </View>
    </View>
  );
}

function makeStyles(panelWidth: number, cardWidth: number) {
  return StyleSheet.create({
    panel: {
      width: panelWidth,
      alignSelf: 'center',
      backgroundColor: 'rgba(10,14,20,0.92)',
      borderRadius: 24,
      padding: PANEL_PAD,
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.12)',
      flexGrow: 0,
      flexShrink: 0,
      ...Platform.select({
        web: {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        } as object,
        default: {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 14,
        },
      }),
    },
    allWrap: { marginBottom: GRID_GAP },
    allBtn: {
      minHeight: 48,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    allBtnMuted: {
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.14)',
    },
    allTxt: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.4 },
    allTxtMuted: { fontSize: 15, fontWeight: '900', color: 'rgba(226,232,240,0.75)', letterSpacing: 1.4 },
    allCheck: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    grid: {
      width: '100%',
      flexGrow: 0,
    },
    row: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
    },
    rowGap: {
      marginBottom: GRID_GAP,
    },
    cell: {
      width: cardWidth,
      maxWidth: cardWidth,
      aspectRatio: 1,
      flexGrow: 0,
      flexShrink: 0,
    },
  });
}
