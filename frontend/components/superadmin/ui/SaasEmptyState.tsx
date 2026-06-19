import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SaasEmptyState({ icon = 'folder-open-outline', title, description, actionLabel, onAction }: Props) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(79,70,229,0.08)' }]}>
        <Ionicons name={icon} size={32} color={theme.colors.primary} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.desc, { color: theme.colors.mutedText }]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={[styles.btn, { backgroundColor: theme.colors.primary }]} activeOpacity={0.9}>
          <Text style={styles.btnTxt}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, gap: 8 },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  desc: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19, maxWidth: 280 },
  btn: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
