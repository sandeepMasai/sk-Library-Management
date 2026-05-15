import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Keyboard,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store';
import FlashToast from '../../components/auth/FlashToast';
import OtpSixBoxes from '../../components/auth/OtpSixBoxes';

const BRAND_LOGO = require('../../assets/logo.png');

export default function ForgotPasswordOtpScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);

  const email = String(route.params?.email || '').trim().toLowerCase();
  const initialCooldown = Number(route.params?.resendAfterSeconds) || 60;

  const verifyForgotPasswordOtp = useAppStore((s) => s.verifyForgotPasswordOtp);
  const sendForgotPasswordOtp = useAppStore((s) => s.sendForgotPasswordOtp);

  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendSec, setResendSec] = useState(initialCooldown);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [inlineErr, setInlineErr] = useState<string | null>(null);

  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!email) {
      navigation.replace('ForgotPassword');
    }
  }, [email, navigation]);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  const runSuccessAnim = useCallback(() => {
    setShowSuccess(true);
    checkScale.setValue(0.4);
    checkOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(checkScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [checkOpacity, checkScale]);

  const verifyNow = useCallback(
    async (code: string) => {
      Keyboard.dismiss();
      setInlineErr(null);
      if (!/^\d{6}$/.test(code)) {
        setInlineErr('Enter the full 6-digit code from your email.');
        return;
      }
      setBusy(true);
      const res = await verifyForgotPasswordOtp(email, code);
      setBusy(false);
      if (!res.ok || !res.resetSessionToken) {
        setToast({ msg: res.message || 'Verification failed', tone: 'error' });
        return;
      }
      runSuccessAnim();
      setTimeout(() => {
        setShowSuccess(false);
        navigation.replace('ResetPassword', {
          email,
          resetSessionToken: res.resetSessionToken,
        });
      }, 900);
    },
    [email, navigation, runSuccessAnim, verifyForgotPasswordOtp]
  );

  useEffect(() => {
    if (otp.length === 6 && !busy && !showSuccess) {
      const t = setTimeout(() => {
        void verifyNow(otp);
      }, 280);
      return () => clearTimeout(t);
    }
  }, [busy, otp, showSuccess, verifyNow]);

  const onResend = async () => {
    if (resendSec > 0 || resending) return;
    Keyboard.dismiss();
    setResending(true);
    const res = await sendForgotPasswordOtp(email);
    setResending(false);
    if (!res.ok) {
      setToast({ msg: res.message || 'Could not resend code', tone: 'error' });
      return;
    }
    setOtp('');
    setResendSec(res.resendAfterSeconds ?? 60);
    setToast({ msg: 'A new code has been sent to your email.', tone: 'success' });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F766E', '#0D9488', '#14B8A6']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.heroTitle}>Check your email</Text>
        <Text style={styles.heroSub}>We sent a 6-digit code to {email || 'your inbox'}.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>ENTER CODE</Text>
            <OtpSixBoxes value={otp} onChange={setOtp} disabled={busy || showSuccess} hasError={Boolean(inlineErr)} />

            {inlineErr ? <Text style={styles.err}>{inlineErr}</Text> : null}

            <TouchableOpacity
              style={[styles.cta, (otp.length !== 6 || busy || showSuccess) && styles.ctaDisabled]}
              onPress={() => void verifyNow(otp)}
              disabled={otp.length !== 6 || busy || showSuccess}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={otp.length === 6 && !busy && !showSuccess ? ['#0f766e', '#14b8a6'] : ['#94a3b8', '#cbd5e1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGrad}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Verify code</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendHint}>Did not receive it?</Text>
              <TouchableOpacity onPress={onResend} disabled={resendSec > 0 || resending} activeOpacity={0.85}>
                {resending ? (
                  <ActivityIndicator size="small" color="#0d9488" />
                ) : (
                  <Text style={[styles.resendBtn, resendSec > 0 && styles.resendBtnDisabled]}>
                    {resendSec > 0 ? `Resend in ${resendSec}s` : 'Resend code'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showSuccess ? (
        <View style={styles.successOverlay} pointerEvents="none">
          <Animated.View style={[styles.successCard, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}>
            <Ionicons name="checkmark-circle" size={72} color="#0f766e" />
            <Text style={styles.successTitle}>Verified</Text>
          </Animated.View>
        </View>
      ) : null}

      <FlashToast visible={!!toast} message={toast?.msg || ''} tone={toast?.tone} onHide={() => setToast(null)} />
    </View>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  const surface = mode === 'dark' ? '#1e293b' : '#ffffff';
  const border = mode === 'dark' ? '#334155' : '#e2e8f0';
  const text = mode === 'dark' ? '#f1f5f9' : '#0f172a';
  const muted = mode === 'dark' ? '#94a3b8' : '#64748b';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: mode === 'dark' ? '#0f172a' : theme.colors.background },
    flex: { flex: 1 },
    hero: {
      paddingHorizontal: 16,
      paddingBottom: 22,
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
      alignItems: 'center',
    },
    back: { alignSelf: 'flex-start', padding: 4, marginBottom: 4 },
    logo: { width: 64, height: 64, marginBottom: 8 },
    heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    heroSub: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.88)',
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    scroll: { padding: 18 },
    card: {
      backgroundColor: surface,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: border,
    },
    sectionLabel: { fontSize: 11, fontWeight: '900', color: muted, letterSpacing: 1, marginBottom: 12 },
    err: { marginTop: 10, fontSize: 13, fontWeight: '700', color: '#dc2626' },
    cta: { marginTop: 22, borderRadius: 16, overflow: 'hidden' },
    ctaDisabled: { opacity: 0.95 },
    ctaGrad: { paddingVertical: 14, alignItems: 'center' },
    ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
    resendRow: { marginTop: 20, alignItems: 'center', gap: 6 },
    resendHint: { fontSize: 13, fontWeight: '600', color: muted },
    resendBtn: { fontSize: 14, fontWeight: '900', color: '#0d9488' },
    resendBtnDisabled: { color: muted },
    successOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15,23,42,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    successCard: {
      backgroundColor: surface,
      paddingHorizontal: 32,
      paddingVertical: 28,
      borderRadius: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    successTitle: { marginTop: 8, fontSize: 20, fontWeight: '900', color: text },
  });
}
