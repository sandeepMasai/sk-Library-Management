import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';

export type MessageSendFeedbackVariant = 'success' | 'error' | 'warning';

export type MessageSendFeedbackState = {
  variant: MessageSendFeedbackVariant;
  title: string;
  subtitle?: string;
  recipientCount?: number;
  messageTitle?: string;
  messageBody?: string;
};

type Props = {
  feedback: MessageSendFeedbackState | null;
  onClose: () => void;
  onRetry?: () => void;
};

function variantConfig(variant: MessageSendFeedbackVariant) {
  if (variant === 'success') {
    return {
      icon: 'checkmark-circle' as const,
      color: '#059669',
      bg: 'rgba(16,185,129,0.14)',
      ring: 'rgba(16,185,129,0.28)',
      btn: '#059669',
      btnLabel: 'Done',
    };
  }
  if (variant === 'error') {
    return {
      icon: 'close-circle' as const,
      color: '#DC2626',
      bg: 'rgba(239,68,68,0.12)',
      ring: 'rgba(239,68,68,0.28)',
      btn: '#DC2626',
      btnLabel: 'Try Again',
    };
  }
  return {
    icon: 'warning' as const,
    color: '#D97706',
    bg: 'rgba(245,158,11,0.14)',
    ring: 'rgba(245,158,11,0.28)',
    btn: '#D97706',
    btnLabel: 'OK',
  };
}

export function MessageSendFeedbackModal({ feedback, onClose, onRetry }: Props) {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const visible = Boolean(feedback);
  const cfg = variantConfig(feedback?.variant || 'success');

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    scale.setValue(0.92);
    checkScale.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start(() => {
      if (feedback?.variant === 'success') {
        Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
      }
    });
  }, [visible, feedback?.variant, opacity, scale, checkScale]);

  const handlePrimary = () => {
    if (feedback?.variant === 'error' && onRetry) {
      onRetry();
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={[styles.iconRing, { borderColor: cfg.ring, backgroundColor: cfg.bg }]}>
            <Animated.View style={{ transform: [{ scale: feedback?.variant === 'success' ? checkScale : 1 }] }}>
              <Ionicons name={cfg.icon} size={44} color={cfg.color} />
            </Animated.View>
          </View>

          <Text style={styles.title}>{feedback?.title}</Text>
          {feedback?.subtitle ? <Text style={styles.subtitle}>{feedback.subtitle}</Text> : null}

          {(feedback?.variant === 'success' && (feedback.messageBody || feedback.messageTitle)) ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewMessage} numberOfLines={6}>
                {feedback.messageBody || feedback.messageTitle}
              </Text>
            </View>
          ) : null}

          {feedback?.variant === 'success' && typeof feedback.recipientCount === 'number' ? (
            <View style={styles.statsBox}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{feedback.recipientCount}</Text>
                <Text style={styles.statLabel}>Recipients</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.deliveryCol}>
                <DeliveryStep icon="✓" label="Sent to inbox" done />
                <DeliveryStep icon="✓✓" label="Push notification" done />
                <DeliveryStep icon="👁" label="Read when opened" pending />
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            {feedback?.variant === 'error' ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.88}>
                <Text style={styles.secondaryBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: cfg.btn }, feedback?.variant !== 'error' && styles.primaryBtnFull]}
              onPress={handlePrimary}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnTxt}>{cfg.btnLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DeliveryStep({ icon, label, done, pending }: { icon: string; label: string; done?: boolean; pending?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Text style={{ fontSize: 13, opacity: done ? 1 : pending ? 0.55 : 0.4 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: done ? '#059669' : theme.colors.mutedText,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  const cardBg = mode === 'dark' ? '#111827' : '#FFFFFF';
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: cardBg,
      borderRadius: 24,
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    iconRing: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.colors.text,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    subtitle: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.mutedText,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 4,
    },
    previewBox: {
      width: '100%',
      marginTop: 16,
      padding: 12,
      borderRadius: 14,
      backgroundColor: mode === 'dark' ? '#1E293B' : '#F8FAFC',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    previewMessage: { fontSize: 14, fontWeight: '600', color: theme.colors.text, lineHeight: 21 },
    statsBox: {
      width: '100%',
      marginTop: 14,
      flexDirection: 'row',
      padding: 14,
      borderRadius: 16,
      backgroundColor: mode === 'dark' ? 'rgba(5,150,105,0.1)' : '#ECFDF5',
      borderWidth: 1,
      borderColor: mode === 'dark' ? 'rgba(5,150,105,0.25)' : '#A7F3D0',
    },
    statItem: { alignItems: 'center', justifyContent: 'center', paddingRight: 12, minWidth: 72 },
    statValue: { fontSize: 28, fontWeight: '900', color: '#059669' },
    statLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.mutedText, marginTop: 2, textTransform: 'uppercase' },
    statDivider: { width: 1, backgroundColor: theme.colors.border, marginRight: 14 },
    deliveryCol: { flex: 1, justifyContent: 'center' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
    primaryBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnFull: { flex: 1 },
    primaryBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
    secondaryBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: mode === 'dark' ? '#1E293B' : '#F8FAFC',
    },
    secondaryBtnTxt: { fontSize: 15, fontWeight: '800', color: theme.colors.mutedText },
  });
}
