import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store';
import OtpBoxes from '../../components/auth/OtpBoxes';
import FlashToast from '../../components/auth/FlashToast';

export default function VerifyOTPScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(), [mode]);

  const flow = (route.params?.flow as 'login' | 'forgot') || 'login';
  const role = route.params?.role as 'student' | 'library' | undefined;
  const mobile = String(route.params?.mobile || '');
  const libraryCode = route.params?.libraryCode as string | undefined;
  const resendAfter = Number(route.params?.resendAfterSeconds) || 60;

  const sendLoginOtp = useAppStore((s) => s.sendLoginOtp);
  const verifyLoginOtp = useAppStore((s) => s.verifyLoginOtp);
  const forgotSend = useAppStore((s) => s.forgotLibraryPasswordSendOtp);
  const forgotVerify = useAppStore((s) => s.forgotLibraryPasswordVerifyOtp);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(resendAfter);
  const [canResend, setCanResend] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (seconds <= 0) {
      setCanResend(true);
      return;
    }
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const onResend = async () => {
    if (!canResend) return;
    Keyboard.dismiss();
    setOtp('');
    setSeconds(resendAfter);
    setCanResend(false);
    let res;
    if (flow === 'forgot') {
      res = await forgotSend(mobile);
    } else if (role) {
      res = await sendLoginOtp({
        mobile,
        role,
        ...(role === 'student' && libraryCode ? { libraryCode } : {}),
      });
    } else {
      setToast({ msg: 'Invalid session', tone: 'error' });
      return;
    }
    if (!res.ok) setToast({ msg: res.message || 'Resend failed', tone: 'error' });
    else setToast({ msg: 'OTP resent', tone: 'success' });
  };

  const onVerify = async () => {
    Keyboard.dismiss();
    const code = otp.replace(/\D/g, '');
    if (code.length < 4) {
      setToast({ msg: 'Enter the OTP from SMS', tone: 'error' });
      return;
    }
    setLoading(true);
    if (flow === 'forgot') {
      const res = await forgotVerify(mobile, code);
      setLoading(false);
      if (!res.ok || !res.resetToken) {
        setToast({ msg: res.message || 'Verification failed', tone: 'error' });
        return;
      }
      setToast({ msg: 'Verified — set a new password', tone: 'success' });
      navigation.replace('ResetPassword', { resetToken: res.resetToken });
      return;
    }
    if (!role) {
      setLoading(false);
      setToast({ msg: 'Missing role', tone: 'error' });
      return;
    }
    const res = await verifyLoginOtp({ mobile, role, otp: code, libraryCode });
    setLoading(false);
    if (!res.ok) {
      setToast({ msg: res.message || 'Invalid OTP', tone: 'error' });
      return;
    }
    const target = role === 'library' ? 'LibraryRoot' : 'StudentRoot';
    navigation.reset({ index: 0, routes: [{ name: target }] });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F766E', '#0D9488', '#14B8A6']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Verify OTP</Text>
        <Text style={styles.heroSub}>Code sent to +91 {mobile}</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <OtpBoxes value={otp} onChange={setOtp} disabled={loading} />

            <TouchableOpacity style={styles.cta} onPress={onVerify} disabled={loading} activeOpacity={0.9}>
              <LinearGradient colors={['#0f766e', '#14b8a6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Verify & continue</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resend, (!canResend || loading) && { opacity: 0.45 }]}
              onPress={onResend}
              disabled={!canResend || loading}
            >
              <Text style={styles.resendTxt}>
                {canResend ? 'Resend OTP' : `Resend in ${seconds}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FlashToast visible={!!toast} message={toast?.msg || ''} tone={toast?.tone} onHide={() => setToast(null)} />
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    hero: {
      paddingHorizontal: 16,
      paddingBottom: 20,
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
    },
    back: { alignSelf: 'flex-start', padding: 4, marginBottom: 8 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
    heroSub: { marginTop: 6, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.88)' },
    scroll: { padding: 18 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cta: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
    ctaGrad: { paddingVertical: 14, alignItems: 'center' },
    ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
    resend: { marginTop: 18, alignItems: 'center' },
    resendTxt: { color: '#0f766e', fontWeight: '800', fontSize: 14 },
  });
}
