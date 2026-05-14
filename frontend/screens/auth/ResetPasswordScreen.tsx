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
  Keyboard,
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

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(), [mode]);
  const resetLibraryPassword = useAppStore((s) => s.resetLibraryPassword);

  const tokenFromRoute = String(route.params?.resetToken || '').trim();
  const [token, setToken] = useState(tokenFromRoute);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [info, setInfo] = useState<{ title: string; description?: string } | null>(null);

  const onReset = async () => {
    Keyboard.dismiss();
    const t = token.trim();
    if (!t) {
      setToast({ msg: 'Reset token missing', tone: 'error' });
      return;
    }
    if (pw1.length < 6) {
      setToast({ msg: 'Password must be at least 6 characters', tone: 'error' });
      return;
    }
    if (pw1 !== pw2) {
      setToast({ msg: 'Passwords do not match', tone: 'error' });
      return;
    }
    setLoading(true);
    const res = await resetLibraryPassword(t, pw1);
    setLoading(false);
    if (!res.ok) {
      setToast({ msg: res.message || 'Reset failed', tone: 'error' });
      return;
    }
    setInfo({ title: 'Done', description: 'Password updated. Please sign in.' });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F766E', '#0D9488', '#14B8A6']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>New password</Text>
        <Text style={styles.heroSub}>Use a strong password you have not used elsewhere.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>RESET TOKEN</Text>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={18} color="#64748b" />
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="Pasted from previous step"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                autoCapitalize="none"
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>NEW PASSWORD</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
              <TextInput
                value={pw1}
                onChangeText={setPw1}
                placeholder="Min 6 characters"
                placeholderTextColor={theme.colors.mutedText}
                secureTextEntry
                style={styles.input}
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>CONFIRM</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
              <TextInput
                value={pw2}
                onChangeText={setPw2}
                placeholder="Repeat password"
                placeholderTextColor={theme.colors.mutedText}
                secureTextEntry
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.cta} onPress={onReset} disabled={loading} activeOpacity={0.9}>
              <LinearGradient colors={['#0f766e', '#14b8a6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Update password</Text>}
              </LinearGradient>
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
        onConfirm={() => {
          setInfo(null);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }}
      />
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
    input: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
    cta: { marginTop: 22, borderRadius: 16, overflow: 'hidden' },
    ctaGrad: { paddingVertical: 14, alignItems: 'center' },
    ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  });
}
