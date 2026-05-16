import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { theme } from '../../../theme';

type Props = { lines?: number; height?: number };

export function DashboardWidgetSkeleton({ lines = 4, height }: Props) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
  }, [pulse]);

  const shimmer = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.75]),
  }));

  return (
    <View style={styles.wrap} accessibilityLabel="Loading">
      {height ? (
        <Animated.View style={[styles.block, { height }, shimmer]} />
      ) : null}
      {Array.from({ length: lines }).map((_, i) => (
        <Animated.View
          key={i}
          style={[styles.line, { width: i === lines - 1 ? '62%' : '100%' }, shimmer]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: 6 },
  block: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.border,
    marginBottom: 4,
  },
  line: {
    height: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
  },
});
