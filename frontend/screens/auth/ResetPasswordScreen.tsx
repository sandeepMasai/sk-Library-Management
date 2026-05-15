import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store';
import FlashToast from '../../components/auth/FlashToast';
import { ConfirmModal } from '../../components/ConfirmModal';

const BRAND_LOGO = require('../../assets/logo.png');

function normalizeResetErrorMessage(raw: string | undefined): string {
  const m = String(raw || '').trim();
  if (!m) return 'Reset failed. Please try again.';
  if (/expired|invalid or has expired/i.test(m)) return m;
  if (/at least 8/i.test(m)) return m;
  return m;
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const completeForgotPasswordReset = useAppStore((s) => s.completeForgotPasswordReset);

  const email = String(route.params?.email || '').trim().toLowerCase();
  const resetSessionToken = String(route.params?.resetSessionToken || '').trim();

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [info, setInfo] = useState<{ title: string; description?: string } | null>(null);

  useEffect(() => {
    if (!email || !resetSessionToken) {
      navigation.replace('ForgotPassword');
    }
  }, [email, navigation, resetSessionToken]);

  const pwOk = pw1.length >= 8;
  const matchOk = pw1.length > 0 && pw1 === pw2;
  const canSubmit = pwOk && matchOk && !loading && Boolean(email && resetSessionToken);

  const onReset = async () => {
    Keyboard.dismiss();
    if (!pwOk) {
      setToast({ msg: 'Password must be at least 8 characters.', tone: 'error' });
      return;
    }
    if (!matchOk) {
      setToast({ msg: 'Passwords do not match.', tone: 'error' });
      return;
    }
    setLoading(true);
    const res = await completeForgotPasswordReset(email, resetSessionToken, pw1);
    setLoading(false);
    if (!res.ok) {
      setToast({ msg: normalizeResetErrorMessage(res.message), tone: 'error' });
      return;
    }
    setInfo({ title: 'Password updated', description: res.message || 'You can now sign in with your new password.' });
  };

  const goLogin = () => {
    setInfo(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0c4a6e', '#0d9488', '#14b8a6']} style={[styles.hero, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.navigate('Login')} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.heroTitle}>Choose a new password</Text>
        <Text style={styles.heroSub}>Use a strong password you have not reused on other sites.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.bannerOk}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#0f766e" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Email verified</Text>
                <Text style={styles.bannerHint}>Your reset session is active. This step completes the process.</Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>NEW PASSWORD</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                <TextInput
                  value={pw1}
                  onChangeText={setPw1}
                  placeholder="At least 8 characters"
                  placeholderTextColor={theme.colors.mutedText}
                  secureTextEntry={!showPw1}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowPw1((p) => !p)} hitSlop={8}>
                  <Ionicons name={showPw1 ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHint}>Use letters, numbers, and symbols. Minimum 8 characters.</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputRow, pw2.length > 0 && !matchOk ? styles.inputRowErr : null]}>
                <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                <TextInput
                  value={pw2}
                  onChangeText={setPw2}
                  placeholder="Repeat new password"
                  placeholderTextColor={theme.colors.mutedText}
                  secureTextEntry={!showPw2}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowPw2((p) => !p)} hitSlop={8}>
                  <Ionicons name={showPw2 ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              {pw2.length > 0 && !matchOk ? <Text style={styles.errInline}>Passwords must match.</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
              onPress={onReset}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={canSubmit ? ['#0f766e', '#14b8a6'] : ['#94a3b8', '#cbd5e1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGrad}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Update password</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.85}>
              <Text style={styles.footerLinkTxt}>Start over</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FlashToast visible={!!toast} message={toast?.msg || ''} tone={toast?.tone} onHide={() => setToast(null)} />

      <ConfirmModal
        visible={!!info}
        tone="neutral"
        label="OK"
        title={info?.title ?? ''}
        description={info?.description}
        showCancel={false}
        confirmText="Go to login"
        confirmIcon="checkmark-outline"
        onCancel={() => setInfo(null)}
        onConfirm={goLogin}
      />
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
      paddingHorizontal: 20,
      paddingBottom: 28,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      alignItems: 'center',
    },
    back: { alignSelf: 'flex-start', padding: 4, marginBottom: 6 },
    logo: { width: 56, height: 56, marginBottom: 10 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
    heroSub: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      paddingHorizontal: 12,
      lineHeight: 20,
    },
    scroll: { padding: 20, paddingBottom: 40 },
    card: {
      backgroundColor: surface,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: border,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: mode === 'dark' ? 0.35 : 0.08,
      shadowRadius: 24,
      elevation: 4,
    },
    bannerOk: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: mode === 'dark' ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(13,148,136,0.35)',
      marginBottom: 16,
    },
    bannerTitle: { fontSize: 15, fontWeight: '800', color: text },
    bannerHint: { marginTop: 4, fontSize: 13, fontWeight: '600', color: muted, lineHeight: 18 },
    fieldBlock: { marginBottom: 4 },
    label: { fontSize: 11, fontWeight: '900', color: muted, letterSpacing: 1 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 8,
      backgroundColor: mode === 'dark' ? '#0f172a' : '#fafafa',
    },
    inputRowErr: { borderColor: '#f97316' },
    input: { flex: 1, fontSize: 16, fontWeight: '600', color: text },
    fieldHint: { marginTop: 8, fontSize: 12, fontWeight: '600', color: muted },
    errInline: { marginTop: 6, fontSize: 12, fontWeight: '700', color: '#ea580c' },
    cta: { marginTop: 22, borderRadius: 16, overflow: 'hidden' },
    ctaDisabled: { opacity: 0.95 },
    ctaGrad: { paddingVertical: 16, alignItems: 'center' },
    ctaTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },
    footerLink: { marginTop: 18, alignItems: 'center', paddingVertical: 8 },
    footerLinkTxt: { color: '#0d9488', fontWeight: '800', fontSize: 14 },
  });
}
