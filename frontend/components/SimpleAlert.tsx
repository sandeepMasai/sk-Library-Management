import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useTheme } from '../theme/ThemeProvider';

export type SimpleAlertTone = 'success' | 'error' | 'warning' | 'info';

type Props = {
  visible: boolean;
  tone?: SimpleAlertTone;
  title: string;
  message?: string;
  buttonText?: string;
  autoCloseMs?: number;
  onClose: () => void;
};

function toneConfig(tone: SimpleAlertTone) {
  if (tone === 'success') {
    return { icon: 'checkmark-circle' as const, color: '#059669', bg: 'rgba(16,185,129,0.12)', btn: '#059669' };
  }
  if (tone === 'error') {
    return { icon: 'alert-circle' as const, color: '#DC2626', bg: 'rgba(239,68,68,0.12)', btn: '#DC2626' };
  }
  if (tone === 'warning') {
    return { icon: 'warning' as const, color: '#D97706', bg: 'rgba(245,158,11,0.14)', btn: '#D97706' };
  }
  return { icon: 'information-circle' as const, color: '#4F46E5', bg: 'rgba(99,102,241,0.12)', btn: '#4F46E5' };
}

export function SimpleAlert({
  visible,
  tone = 'info',
  title,
  message,
  buttonText = 'OK',
  autoCloseMs,
  onClose,
}: Props) {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const cfg = toneConfig(tone);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    scale.setValue(0.94);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, scale]);

  useEffect(() => {
    if (!visible || !autoCloseMs) return undefined;
    const id = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(id);
  }, [visible, autoCloseMs, onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={32} color={cfg.color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onClose}
            style={[styles.btn, { backgroundColor: cfg.btn }]}
          >
            <Text style={styles.btnTxt}>{buttonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingHorizontal: 22,
      paddingTop: 26,
      paddingBottom: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      marginTop: 14,
      fontSize: 18,
      fontWeight: '900',
      color: theme.colors.text,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    message: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.mutedText,
      textAlign: 'center',
      lineHeight: 19,
    },
    btn: {
      marginTop: 20,
      width: '100%',
      paddingVertical: 13,
      borderRadius: 14,
      alignItems: 'center',
    },
    btnTxt: { color: '#fff', fontSize: 14, fontWeight: '900' },
  });
}
