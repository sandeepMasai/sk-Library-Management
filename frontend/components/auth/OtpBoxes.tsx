import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData, Platform } from 'react-native';
import { theme } from '../../theme';

const CELL = 46;
const GAP = 8;
const COUNT = 6;

type Props = {
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
};

/**
 * Six separate OTP boxes with auto-advance and backspace handling.
 */
export default function OtpBoxes({ value, onChange, disabled }: Props) {
  const refs = useRef<Array<TextInput | null>>([]);
  const [cells, setCells] = useState<string[]>(() => Array.from({ length: COUNT }, (_, i) => value[i] || ''));

  useEffect(() => {
    const next = Array.from({ length: COUNT }, (_, i) => value[i] || '');
    setCells(next);
  }, [value]);

  const commit = (arr: string[]) => {
    setCells(arr);
    onChange(arr.join('').replace(/\D/g, '').slice(0, COUNT));
  };

  const focusAt = (i: number) => {
    const r = refs.current[Math.max(0, Math.min(COUNT - 1, i))];
    r?.focus();
  };

  const onChangeCell = (i: number, t: string) => {
    const d = t.replace(/\D/g, '').slice(-1);
    const next = [...cells];
    next[i] = d;
    commit(next);
    if (d && i < COUNT - 1) focusAt(i + 1);
  };

  const onKeyPress = (i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !cells[i] && i > 0) {
      focusAt(i - 1);
    }
  };

  return (
    <View style={styles.row}>
      {cells.map((c, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          value={c}
          onChangeText={(t) => onChangeCell(i, t)}
          onKeyPress={(e) => onKeyPress(i, e)}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          selectTextOnFocus
          style={[styles.cell, disabled && styles.cellDisabled]}
          textAlign="center"
          autoCorrect={false}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: GAP,
    marginTop: 4,
  },
  cell: {
    width: CELL,
    height: CELL + 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    ...Platform.select({ web: { outlineStyle: 'none' as const } }),
  },
  cellDisabled: { opacity: 0.5 },
});
