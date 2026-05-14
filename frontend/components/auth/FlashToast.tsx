import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Tone = 'success' | 'error' | 'neutral';

type Props = {
  visible: boolean;
  message: string;
  tone?: Tone;
  onHide?: () => void;
};

/**
 * Lightweight bottom toast (no extra deps). Fades in/out.
 */
export default function FlashToast({ visible, message, tone = 'neutral', onHide }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !message) {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onHide?.());
      return;
    }
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onHide?.());
  }, [visible, message, opacity, onHide]);

  if (!message) return null;

  const bg =
    tone === 'success' ? 'rgba(16,185,129,0.95)' : tone === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(15,23,42,0.88)';

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={styles.txt}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    maxWidth: 420,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  txt: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
