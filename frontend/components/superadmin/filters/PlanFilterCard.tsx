import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ban, BadgeCheck, Check, CreditCard, FileCheck } from 'lucide-react-native';
import type { PlanCardConfig, PlanCardIcon } from './planFilterConfig';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  config: PlanCardConfig;
  selected: boolean;
  /** Cell width from grid (square via parent aspectRatio). */
  width: number;
  onPress: () => void;
};

function PlanIcon({ type, color, size }: { type: PlanCardIcon; color: string; size: number }) {
  const stroke = 2.2;
  if (type === 'free') return <FileCheck size={size} color={color} strokeWidth={stroke} />;
  if (type === 'pro') return <BadgeCheck size={size} color={color} strokeWidth={stroke} />;
  if (type === 'trial') return <CreditCard size={size} color={color} strokeWidth={stroke} />;
  return <Ban size={size} color={color} strokeWidth={stroke} />;
}

/** Glass plan card — fills parent cell (square), compact icon + label. */
export function PlanFilterCard({ config, selected, width, onPress }: Props) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(selected ? 1 : 0);
  const pressed = useSharedValue(0);

  const radius = Math.round(width * 0.2);
  const iconBox = Math.round(width * 0.38);
  const iconSize = Math.round(iconBox * 0.52);

  useEffect(() => {
    if (selected) {
      scale.value = withSpring(1.03, { damping: 14, stiffness: 220 });
      glow.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [selected, glow, scale]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * interpolate(pressed.value, [0, 1], [1, 0.96]) }],
  }));

  const glowAnim = useAnimatedStyle(() => ({
    opacity: selected ? interpolate(glow.value, [0, 1], [0.55, 1]) : 0,
  }));

  const inner = (
    <View style={[styles.glassInner, { borderRadius: radius }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.02)', 'transparent']}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {selected ? (
        <Animated.View style={[styles.glowOverlay, glowAnim, { shadowColor: config.glow }]}>
          <LinearGradient
            colors={[withAlpha(config.gradient[0], 0.25), 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>
      ) : null}

      {selected ? (
        <View style={[styles.checkBadge, { backgroundColor: config.gradient[0] }]}>
          <Check size={10} color="#FFFFFF" strokeWidth={3} />
        </View>
      ) : null}

      <View style={[styles.iconHalo, { shadowColor: config.glow, marginBottom: width * 0.06 }]}>
        <LinearGradient
          colors={
            selected
              ? [withAlpha(config.gradient[0], 0.35), withAlpha(config.gradient[1], 0.1)]
              : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']
          }
          style={[styles.iconCircle, { width: iconBox, height: iconBox, borderRadius: iconBox * 0.28 }]}
        >
          <PlanIcon type={config.icon} color={selected ? '#E0E7FF' : '#94A3B8'} size={iconSize} />
        </LinearGradient>
      </View>

      <Text style={[styles.label, selected && styles.labelSelected, { fontSize: Math.max(11, width * 0.11) }]}>
        {config.label}
      </Text>
    </View>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 120 });
      }}
      style={[styles.fill, cardAnim]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${config.label} plan filter`}
    >
      {selected ? (
        <LinearGradient
          colors={[...config.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.borderGradient, { borderRadius: radius + 2 }]}
        >
          <View style={[styles.borderPad, { borderRadius: radius }]}>{inner}</View>
        </LinearGradient>
      ) : (
        <View style={[styles.cardDefault, { borderRadius: radius, borderColor: 'rgba(148,163,184,0.16)' }]}>
          {inner}
        </View>
      )}
    </AnimatedPressable>
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

const glassBg = 'rgba(22,28,38,0.72)';

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  borderGradient: {
    flex: 1,
    padding: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 8 },
      default: {} as object,
    }),
  },
  borderPad: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: glassBg,
  },
  cardDefault: {
    flex: 1,
    backgroundColor: glassBg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as object,
    }),
  },
  glassInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: glassBg,
    paddingVertical: 8,
    paddingHorizontal: 6,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      } as object,
    }),
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  iconHalo: {
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(226,232,240,0.75)',
    textAlign: 'center',
  },
  labelSelected: {
    color: '#F8FAFC',
  },
});
