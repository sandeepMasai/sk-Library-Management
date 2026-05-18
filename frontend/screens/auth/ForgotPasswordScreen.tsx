import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store';
import FlashToast from '../../components/auth/FlashToast';
import AuthKeyboardScroll, { useAuthFieldFocus } from '../../components/auth/AuthKeyboardScroll';

const BRAND_LOGO = require('../../assets/logo.png');

function isValidEmail(raw: string): boolean {
  const s = String(raw || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Forgot password — sends a 6-digit email code (POST /api/auth/forgot-password/send-otp).
 */
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(), [mode]);
  const sendForgotPasswordOtp = useAppStore((s) => s.sendForgotPasswordOtp);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const onSend = async () => {
    Keyboard.dismiss();
    const e = email.trim().toLowerCase();
    if (!isValidEmail(e)) {
      setToast({ msg: 'Enter a valid email address', tone: 'error' });
      return;
    }
    setLoading(true);
    const res = await sendForgotPasswordOtp(e);
    setLoading(false);
    if (!res.ok) {
      setToast({ msg: res.message || 'Could not send code', tone: 'error' });
      return;
    }
    navigation.navigate('ForgotPasswordOtp', {
      email: e,
      resendAfterSeconds: res.resendAfterSeconds ?? 60,
      expiryMinutes: res.expiryMinutes,
    });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F766E', '#0D9488', '#14B8A6']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.heroTitle}>Reset password</Text>
        <Text style={styles.heroSub}>We will email you a one-time 6-digit code to verify it is you.</Text>
      </LinearGradient>

      <AuthKeyboardScroll contentContainerStyle={styles.scroll}>
        <ForgotPasswordForm
          email={email}
          setEmail={setEmail}
          loading={loading}
          onSend={onSend}
          styles={styles}
        />
      </AuthKeyboardScroll>

      <FlashToast visible={!!toast} message={toast?.msg || ''} tone={toast?.tone} onHide={() => setToast(null)} />
    </View>
  );
}

function ForgotPasswordForm({
  email,
  setEmail,
  loading,
  onSend,
  styles,
}: {
  email: string;
  setEmail: (v: string) => void;
  loading: boolean;
  onSend: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { wrapRef, onInputFocus } = useAuthFieldFocus();

  return (
    <View style={styles.card}>
      <Text style={styles.label}>REGISTERED EMAIL</Text>
      <View ref={wrapRef} collapsable={false} style={styles.inputRow}>
        <Ionicons name="mail-outline" size={18} color="#64748b" />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.mutedText}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          onFocus={onInputFocus}
        />
      </View>

      <TouchableOpacity style={styles.cta} onPress={onSend} disabled={loading} activeOpacity={0.9}>
        <LinearGradient colors={['#0f766e', '#14b8a6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGrad}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Send code</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
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
    heroSub: { marginTop: 6, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.88)', textAlign: 'center', paddingHorizontal: 12 },
    scroll: { padding: 18 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    label: { fontSize: 11, fontWeight: '900', color: theme.colors.mutedText, letterSpacing: 1 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 8,
    },
    input: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.text },
    cta: { marginTop: 22, borderRadius: 16, overflow: 'hidden' },
    ctaGrad: { paddingVertical: 14, alignItems: 'center' },
    ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  });
}
