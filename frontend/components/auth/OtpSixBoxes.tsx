import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

const TEAL = '#0d9488';
const TEAL_SOFT = '#f0fdfa';

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  onFocus?: () => void;
};

type CellProps = {
  char: string;
  filled: boolean;
  active: boolean;
  disabled?: boolean;
  hasError?: boolean;
  isDark: boolean;
  mutedColor: string;
};

function OtpDigitCell({
  char,
  filled,
  active,
  disabled,
  hasError,
  isDark,
  mutedColor,
}: CellProps) {
  const glow = useSharedValue(0);

  useEffect(() => {
    if (active && !disabled && !hasError) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    } else {
      glow.value = withTiming(0, { duration: 220 });
    }
  }, [active, disabled, hasError, glow]);

  const animatedBox = useAnimatedStyle(() => {
    const shadowOp = interpolate(glow.value, [0, 1], [0, 0.42]);
    const shadowR = interpolate(glow.value, [0, 1], [0, 12]);
    return {
      borderWidth: interpolate(glow.value, [0, 1], [1.5, 2.25]),
      shadowColor: TEAL,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: active && !disabled && !hasError ? shadowOp : hasError ? 0.12 : 0,
      shadowRadius: active && !disabled && !hasError ? shadowR : hasError ? 4 : 0,
      elevation: active && !disabled && !hasError ? interpolate(glow.value, [0, 1], [1, 6]) : hasError ? 2 : 0,
    };
  });

  const borderBase = hasError ? 'rgba(239,68,68,0.9)' : isDark ? 'rgba(148,163,184,0.35)' : '#e2e8f0';
  const borderFilled = hasError ? 'rgba(239,68,68,0.95)' : TEAL;
  const bgEmpty = isDark ? 'rgba(15,23,42,0.55)' : '#f8fafc';
  const bgFilled = hasError ? 'rgba(239,68,68,0.08)' : isDark ? 'rgba(20,184,166,0.16)' : TEAL_SOFT;

  const animatedBorder = useAnimatedStyle(() => {
    if (hasError) {
      return { borderColor: borderFilled };
    }
    if (!active || disabled) {
      return { borderColor: filled ? borderFilled : borderBase };
    }
    return {
      borderColor: interpolateColor(glow.value, [0, 1], ['#99f6e4', TEAL]),
    };
  });

  return (
    <Animated.View
      style={[
        styles.cell,
        { backgroundColor: filled ? bgFilled : bgEmpty },
        animatedBox,
        animatedBorder,
      ]}
    >
      <Text style={[styles.digit, { color: filled ? (hasError ? '#b91c1c' : TEAL) : mutedColor }]}>
        {filled ? char : ''}
      </Text>
      {active && !disabled && !filled && !hasError ? (
        <View style={styles.cursorTrack}>
          <CursorPulse />
        </View>
      ) : null}
    </Animated.View>
  );
}

function CursorPulse() {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 530, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [v]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 1], [0.35, 1]),
  }));

  return (
    <Animated.View style={[styles.cursorBar, style]} />
  );
}

/**
 * Hidden numeric input + six premium cells (paste-friendly, mobile-first).
 */
export default function OtpSixBoxes({ value, onChange, disabled, hasError, onFocus }: Props) {
  const inputRef = useRef<TextInput>(null);
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { width: winW } = useWindowDimensions();
  const raw = String(value || '').replace(/\D/g, '').slice(0, 6);
  const digits = useMemo(() => [...`${raw}      `].slice(0, 6), [raw]);

  const sync = (nextRaw: string) => {
    const next = nextRaw.replace(/\D/g, '').slice(0, 6);
    onChange(next);
  };

  const muted = isDark ? '#64748b' : '#94a3b8';

  const maxCard = Math.min(winW - 36, 520);
  const rowPad = 32; // approx card horizontal padding
  const rowInner = Math.min(maxCard - rowPad, winW - 40);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Enter 6 digit verification code"
      disabled={disabled}
      onPress={() => {
        if (!disabled) inputRef.current?.focus();
      }}
      style={{ width: '100%', maxWidth: rowInner, alignSelf: 'center' }}
    >
      <View style={styles.row}>
        {digits.map((ch, i) => {
          const filled = ch.trim().length > 0;
          const active = i === Math.min(raw.length, 5);
          return (
            <OtpDigitCell
              key={i}
              char={ch.trim()}
              filled={filled}
              active={active}
              disabled={disabled}
              hasError={Boolean(hasError)}
              isDark={isDark}
              mutedColor={muted}
            />
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={raw}
        onChangeText={sync}
        onFocus={onFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={6}
        editable={!disabled}
        importantForAutofill="yes"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: 52,
    maxWidth: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  digit: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cursorTrack: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  cursorBar: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: TEAL,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: 0,
    top: 0,
  },
});
