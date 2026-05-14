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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store';
import FlashToast from '../../components/auth/FlashToast';

const BRAND_LOGO = require('../../assets/logo.png');

export default function MobileLoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(), [mode]);
  const sendLoginOtp = useAppStore((s) => s.sendLoginOtp);

  const [role, setRole] = useState<'student' | 'library'>('student');
  const [mobile, setMobile] = useState('');
  const [libraryCode, setLibraryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const onSend = async () => {
    Keyboard.dismiss();
    const m = mobile.replace(/\D/g, '').slice(0, 10);
    if (m.length !== 10) {
      setToast({ msg: 'Enter a valid 10-digit mobile number', tone: 'error' });
      return;
    }
    if (role === 'student' && !libraryCode.trim()) {
      setToast({ msg: 'Library code is required for students', tone: 'error' });
      return;
    }
    setLoading(true);
    const res = await sendLoginOtp({
      mobile: m,
      role,
      ...(role === 'student' ? { libraryCode: libraryCode.trim().toUpperCase() } : {}),
    });
    setLoading(false);
    if (!res.ok) {
      setToast({ msg: res.message || 'Could not send OTP', tone: 'error' });
      return;
    }
    setToast({ msg: 'OTP sent to your mobile', tone: 'success' });
    navigation.navigate('VerifyOTP', {
      flow: 'login',
      role,
      mobile: m,
      libraryCode: role === 'student' ? libraryCode.trim().toUpperCase() : undefined,
      resendAfterSeconds: 60,
    });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F766E', '#0D9488', '#14B8A6']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.heroTitle}>Sign in with OTP</Text>
        <Text style={styles.heroSub}>We’ll text a one-time code to your registered mobile.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>ACCOUNT TYPE</Text>
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segBtn, role === 'student' && styles.segBtnOn]}
                onPress={() => setRole('student')}
                activeOpacity={0.85}
              >
                <Text style={[styles.segTxt, role === 'student' && styles.segTxtOn]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segBtn, role === 'library' && styles.segBtnOn]}
                onPress={() => setRole('library')}
                activeOpacity={0.85}
              >
                <Text style={[styles.segTxt, role === 'library' && styles.segTxtOn]}>Library</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>MOBILE NUMBER</Text>
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

            {role === 'student' ? (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>LIBRARY CODE</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="business-outline" size={18} color="#64748b" />
                  <TextInput
                    value={libraryCode}
                    onChangeText={(t) => setLibraryCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    placeholder="From your library"
                    placeholderTextColor={theme.colors.mutedText}
                    autoCapitalize="characters"
                    style={styles.input}
                  />
                </View>
              </>
            ) : null}

            <TouchableOpacity style={styles.cta} onPress={onSend} disabled={loading} activeOpacity={0.9}>
              <LinearGradient colors={['#0f766e', '#14b8a6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Send OTP</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.linkTxt}>Back to password login</Text>
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
      paddingHorizontal: 20,
      paddingBottom: 22,
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
      alignItems: 'center',
    },
    logo: { width: 72, height: 72, marginBottom: 10 },
    heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    heroSub: { marginTop: 6, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
    scroll: { padding: 18, paddingBottom: 40 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    label: { fontSize: 11, fontWeight: '900', color: theme.colors.mutedText, letterSpacing: 1 },
    segment: { flexDirection: 'row', gap: 10, marginTop: 8 },
    segBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    segBtnOn: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
    segTxt: { fontSize: 14, fontWeight: '700', color: theme.colors.mutedText },
    segTxtOn: { color: '#0f766e' },
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
      backgroundColor: theme.colors.surface,
    },
    input: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.text },
    cta: { marginTop: 22, borderRadius: 16, overflow: 'hidden' },
    ctaGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
    link: { marginTop: 18, alignItems: 'center' },
    linkTxt: { color: '#0f766e', fontWeight: '700', fontSize: 14 },
  });
}
