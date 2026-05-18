import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { useAppStore } from '../../store';
import { useTheme } from '../../theme/ThemeProvider';
import { ConfirmModal } from '../../components/ConfirmModal';
import { resetAfterAuth } from '../../navigation/rootNavigation';
import AuthKeyboardScroll, { useAuthKeyboardScroll } from '../../components/auth/AuthKeyboardScroll';

function AdminLoginForm({
  username,
  setUsername,
  pin,
  setPin,
  loading,
  uFocus,
  setUFocus,
  pFocus,
  setPFocus,
  handleLogin,
}: {
  username: string;
  setUsername: (v: string) => void;
  pin: string;
  setPin: (v: string) => void;
  loading: boolean;
  uFocus: boolean;
  setUFocus: (v: boolean) => void;
  pFocus: boolean;
  setPFocus: (v: boolean) => void;
  handleLogin: () => void;
}) {
  const styles = React.useMemo(() => makeStyles(), []);
  const { onFieldFocus } = useAuthKeyboardScroll();
  const userWrapRef = useRef<View>(null);
  const pinWrapRef = useRef<View>(null);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Sign in</Text>

      <View ref={userWrapRef} collapsable={false}>
        <Text style={styles.fieldLabel}>USERNAME</Text>
        <View style={[styles.fieldRow, uFocus && styles.fieldRowFocus]}>
          <Ionicons name="person-outline" size={18} color={uFocus ? stylesVars.accent : stylesVars.icon} />
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="admin"
            placeholderTextColor={stylesVars.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => {
              setUFocus(true);
              onFieldFocus(userWrapRef.current);
            }}
            onBlur={() => setUFocus(false)}
            style={styles.fieldInput}
            returnKeyType="next"
          />
        </View>
      </View>

      <View ref={pinWrapRef} collapsable={false}>
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PASSWORD / PIN</Text>
        <View style={[styles.fieldRow, pFocus && styles.fieldRowFocus]}>
          <Ionicons name="key-outline" size={18} color={pFocus ? stylesVars.accent : stylesVars.icon} />
          <TextInput
            value={pin}
            onChangeText={setPin}
            placeholder="From backend .env ADMIN_PIN"
            placeholderTextColor={stylesVars.placeholder}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => {
              setPFocus(true);
              onFieldFocus(pinWrapRef.current);
            }}
            onBlur={() => setPFocus(false)}
            style={styles.fieldInput}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>
      </View>

      <TouchableOpacity onPress={handleLogin} activeOpacity={0.9} style={styles.loginBtn} disabled={loading}>
        {loading ? <ActivityIndicator color="#0B1220" /> : <Text style={styles.loginTxt}>ADMIN LOGIN</Text>}
      </TouchableOpacity>
    </View>
  );
}

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(), [mode]);

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [uFocus, setUFocus] = useState(false);
  const [pFocus, setPFocus] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; description?: string } | null>(null);

  const adminLogin = useAppStore((s) => (s as any).adminLogin as (u: string, p: string) => Promise<{ ok: boolean; message?: string }>);
  const role = useAppStore((s) => s.role);

  const handleLogin = async () => {
    Keyboard.dismiss();
    const u = username.trim();
    const p = pin.trim();
    if (!u || !p) {
      setInfoModal({ title: 'Required', description: 'Enter admin username and PIN.' });
      return;
    }
    setLoading(true);
    const res = await adminLogin(u, p);
    setLoading(false);
    if (!res.ok) {
      setInfoModal({
        title: "Couldn't sign in",
        description:
          res.message ||
          'Check ADMIN_USERNAME and ADMIN_PIN in backend/.env (default PIN in docs may differ).',
      });
      return;
    }

    if (Platform.OS === 'web') {
      Linking.openURL('/superadmin/dashboard');
      return;
    }
    resetAfterAuth('admin');
  };

  useEffect(() => {
    if (role !== 'admin' || !useAppStore.getState().isAuthenticated()) return;
    if (Platform.OS === 'web') {
      Linking.openURL('/superadmin/dashboard');
      return;
    }
    resetAfterAuth('admin');
  }, [role]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#111827', '#0B1220', '#111827']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.secureLabel}>ADMIN ACCESS</Text>
        <Text style={styles.brandName}>Admin Console</Text>
        <Text style={styles.brandTagline}>Restricted area. Authorized personnel only.</Text>
      </LinearGradient>

      <AuthKeyboardScroll contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <AdminLoginForm
          username={username}
          setUsername={setUsername}
          pin={pin}
          setPin={setPin}
          loading={loading}
          uFocus={uFocus}
          setUFocus={setUFocus}
          pFocus={pFocus}
          setPFocus={setPFocus}
          handleLogin={handleLogin}
        />
      </AuthKeyboardScroll>

      <ConfirmModal
        visible={Boolean(infoModal)}
        tone="neutral"
        label="OK"
        title={infoModal?.title || ''}
        description={infoModal?.description || ''}
        showCancel={false}
        confirmText="OK"
        confirmIcon="checkmark-outline"
        onCancel={() => setInfoModal(null)}
        onConfirm={() => setInfoModal(null)}
      />
    </View>
  );
}

const stylesVars = {
  accent: '#22C55E',
  icon: 'rgba(148,163,184,0.85)',
  placeholder: 'rgba(148,163,184,0.75)',
};

function makeStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    hero: { paddingHorizontal: 18, paddingBottom: 18 },
    secureLabel: { color: 'rgba(226,232,240,0.85)', fontWeight: '900', letterSpacing: 1.2, fontSize: 11 },
    brandName: { marginTop: 10, color: '#fff', fontWeight: '900', fontSize: 26, letterSpacing: -0.4 },
    brandTagline: { marginTop: 6, color: 'rgba(226,232,240,0.85)', fontWeight: '700' },
    card: {
      marginTop: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 18 },
    fieldLabel: { marginTop: 14, color: theme.colors.mutedText, fontWeight: '900', fontSize: 11, letterSpacing: 1.1 },
    fieldRow: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    fieldRowFocus: { borderColor: stylesVars.accent },
    fieldInput: { flex: 1, color: theme.colors.text, fontWeight: '800' },
    loginBtn: {
      marginTop: 18,
      backgroundColor: '#22C55E',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginTxt: { color: '#0B1220', fontWeight: '900', letterSpacing: 1.0 },
  });
}
