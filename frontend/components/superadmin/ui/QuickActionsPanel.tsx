import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';

export type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

type Props = {
  actions: QuickAction[];
  title?: string;
};

export function QuickActionsPanel({ actions, title = 'Quick Actions' }: Props) {
  const { width } = useWindowDimensions();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const isCompact = width < 640;
  const itemBasis = isCompact ? '47%' : '23%';

  return (
    <View style={[styles.panel, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <View style={styles.grid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.key}
            onPress={a.onPress}
            activeOpacity={0.88}
            style={[
              styles.card,
              {
                width: itemBasis,
                borderColor: theme.colors.border,
                backgroundColor: isDark ? 'rgba(148,163,184,0.06)' : theme.colors.background,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: a.color + (isDark ? '22' : '14') }]}>
              <Ionicons name={a.icon} size={20} color={a.color} />
            </View>
            <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={2}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  title: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    minWidth: 120,
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '800', lineHeight: 16 },
});
