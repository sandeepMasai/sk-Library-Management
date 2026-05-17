import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store';
import { theme } from '../../theme';
import { SignOutConfirmModal } from '../../components/SignOutConfirmModal';
import { resetAuthNavigation } from '../../navigation/rootNavigation';

export default function AdminSettingsScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const onLogout = () => setShowLogoutModal(true);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    resetAuthNavigation('Login');
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.kicker}>ADMIN</Text>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={22} color={theme.colors.mutedText} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Signed in as</Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {currentUser?.name || 'Admin'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={onLogout}>
          <LinearGradient
            colors={['#EF4444', '#B91C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGrad}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.btnTxt}>Sign out</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.logoutHint}>You can sign in again anytime.</Text>
      </View>

      <SignOutConfirmModal
        visible={showLogoutModal}
        preset="libraryAdmin"
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadow.card,
  },
  kicker: { fontSize: 11, fontWeight: '900', color: theme.colors.mutedText, letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.3, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  rowTitle: { fontSize: 12, fontWeight: '900', color: theme.colors.mutedText, textTransform: 'uppercase', letterSpacing: 0.9 },
  rowSub: { marginTop: 2, fontSize: 14, fontWeight: '900', color: theme.colors.text },
  btn: {
    marginTop: 18,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnGrad: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
  logoutHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
});

