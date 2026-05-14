import React, { useMemo, useState } from 'react';
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

const BRAND_LOGO = require('../../assets/logo.png');

/**
 * Library forgot password — MSG91 OTP to registered mobile on the library profile.
 */
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(), [mode]);
  const forgotSend = useAppStore((s) => s.forgotLibraryPasswordSendOtp);

  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const onSend = async () => {
    Keyboard.dismiss();
    const m = mobile.replace(/\D/g, '').slice(0, 10);
    if (m.length !== 10) {
      setToast({ msg: 'Enter the 10-digit registered mobile', tone: 'error' });
      return;
    }
    setLoading(true);
    const res = await forgotSend(m);
    setLoading(false);
    if (!res.ok) {
      setToast({ msg: res.message || 'Could not send OTP', tone: 'error' });
      return;
    }
    setToast({ msg: 'OTP sent', tone: 'success' });
    navigation.navigate('VerifyOTP', {
      flow: 'forgot',
      mobile: m,
      resendAfterSeconds: 60,
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
        <Text style={styles.heroSub}>OTP will be sent to your library’s registered mobile number.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>REGISTERED MOBILE</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={18} color="#64748b" />
              <TextInput
                value={mobile}
                onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                placeholderTextColor={theme.colors.mutedText}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.cta} onPress={onSend} disabled={loading} activeOpacity={0.9}>
              <LinearGradient colors={['#0f766e', '#14b8a6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Send OTP</Text>}
              </LinearGradient>
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
