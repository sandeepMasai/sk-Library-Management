import React, { useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  hasError?: boolean;
};

/**
 * Single hidden numeric input + six visible cells (paste-friendly, mobile-first).
 */
export default function OtpSixBoxes({ value, onChange, disabled, hasError }: Props) {
  const inputRef = useRef<TextInput>(null);
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const raw = String(value || '').replace(/\D/g, '').slice(0, 6);
  const digits = useMemo(() => [...`${raw}      `].slice(0, 6), [raw]);

  const sync = (nextRaw: string) => {
    const next = nextRaw.replace(/\D/g, '').slice(0, 6);
    onChange(next);
  };

  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#64748b' : '#94a3b8';
  const border = isDark ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.55)';
  const borderFilled = 'rgba(13,148,136,0.65)';
  const borderActive = 'rgba(13,148,136,0.95)';
  const surface = isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.75)';

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPress={() => {
        if (!disabled) inputRef.current?.focus();
      }}
      accessibilityRole="button"
      accessibilityLabel="Enter 6 digit verification code"
    >
      <View style={styles.row}>
        {digits.map((ch, i) => {
          const filled = ch.trim().length > 0;
          const active = i === Math.min(raw.length, 5);
          return (
            <View
              key={i}
              style={[
                styles.cell,
                { borderColor: border, backgroundColor: surface },
                filled && {
                  borderColor: borderFilled,
                  backgroundColor: isDark ? 'rgba(20,184,166,0.14)' : 'rgba(20,184,166,0.12)',
                },
                active && !disabled && { borderColor: borderActive },
                hasError && { borderColor: 'rgba(239,68,68,0.85)', backgroundColor: 'rgba(239,68,68,0.08)' },
              ]}
            >
              <Text style={[styles.digit, { color: text }, !filled && { color: muted }]}>{filled ? ch : '—'}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={raw}
        onChangeText={sync}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={6}
        editable={!disabled}
        importantForAutofill="yes"
        style={styles.hiddenInput}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    minWidth: 44,
    maxWidth: 56,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 20,
    fontWeight: '900',
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
