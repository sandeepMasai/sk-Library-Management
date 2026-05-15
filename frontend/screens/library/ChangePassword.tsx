import React from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import FlashToast from '../../components/auth/FlashToast';

function validateLibraryPassword(pw: string): string | null {
  const s = String(pw || '').trim();
  if (s.length < 8) return 'New password must be at least 8 characters.';
  if (s.length > 128) return 'New password is too long.';
  if (!/[a-zA-Z]/.test(s)) return 'New password must include at least one letter.';
  if (!/\d/.test(s)) return 'New password must include at least one number.';
  return null;
}

export default function LibraryChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(), [mode]);

  const changePassword = useAppStore((s) => s.changeLibraryPassword);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const onSave = async () => {
    const cur = currentPassword.trim();
    if (!cur) {
      setToast({ msg: 'Please enter your current password.', tone: 'error' });
      return;
    }
    const strengthErr = validateLibraryPassword(newPassword);
    if (strengthErr) {
      setToast({ msg: strengthErr, tone: 'error' });
      return;
    }
    if (newPassword !== confirm) {
      setToast({ msg: 'New password and confirmation do not match.', tone: 'error' });
      return;
    }
    if (newPassword === cur) {
      setToast({ msg: 'New password must be different from your current password.', tone: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword(cur, newPassword, confirm.trim());
      if (!res.ok) {
        setToast({ msg: res.message || 'Could not change password.', tone: 'error' });
        return;
      }
      setToast({ msg: res.message || 'Password updated successfully', tone: 'success' });
      setTimeout(() => navigation.goBack(), 1600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Change Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.hint}>
              Use at least 8 characters with at least one letter and one number. Avoid reusing old passwords.
            </Text>

            <Text style={styles.label}>Current password</Text>
            <View style={styles.inputShell}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.colors.mutedText} />
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={10} accessibilityLabel="Toggle current password visibility">
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.mutedText} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New password</Text>
            <View style={styles.inputShell}>
              <Ionicons name="key-outline" size={18} color={theme.colors.mutedText} />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={10} accessibilityLabel="Toggle new password visibility">
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.mutedText} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm password</Text>
            <View style={styles.inputShell}>
              <Ionicons name="key-outline" size={18} color={theme.colors.mutedText} />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onSave}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={10} accessibilityLabel="Toggle confirm password visibility">
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.mutedText} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onSave}
              activeOpacity={0.9}
              style={[styles.btn, loading && { opacity: 0.7 }]}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={theme.colors.dark} /> : <Text style={styles.btnTxt}>Update password</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FlashToast visible={!!toast} message={toast?.msg || ''} tone={toast?.tone} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { paddingBottom: 32 },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
    card: {
      margin: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    hint: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.mutedText,
      lineHeight: 18,
      marginBottom: 8,
    },
    label: {
      marginTop: 12,
      marginBottom: 6,
      fontSize: 11,
      fontWeight: '900',
      color: theme.colors.mutedText,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    inputShell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.background,
      minHeight: 50,
    },
    input: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text, paddingVertical: 12 },
    btn: {
      marginTop: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    btnTxt: { color: theme.colors.dark, fontWeight: '900' },
  });
}
