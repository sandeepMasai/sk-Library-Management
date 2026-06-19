import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { theme } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';

type Props = { count?: number };

export function KpiGridSkeleton({ count = 4 }: Props) {
  const { width } = useWindowDimensions();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const cardWidth = width < 400 ? '100%' : width < 720 ? '48%' : '23.5%';
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [pulse]);

  const shimmer = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.85]),
  }));

  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.card,
            shimmer,
            {
              width: cardWidth,
              backgroundColor: isDark ? 'rgba(148,163,184,0.08)' : theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : theme.colors.border }]} />
          <View style={[styles.lineLg, { backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : theme.colors.border }]} />
          <View style={[styles.lineSm, { backgroundColor: isDark ? 'rgba(148,163,184,0.1)' : theme.colors.border }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: theme.spacing.md },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 118,
    gap: 10,
  },
  icon: { width: 40, height: 40, borderRadius: 12 },
  lineLg: { height: 22, borderRadius: 8, width: '55%' },
  lineSm: { height: 12, borderRadius: 6, width: '40%' },
});
