import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { theme } from '../../theme';
import { useAppStore } from '../../store';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SimpleAlert, type SimpleAlertTone } from '../../components/SimpleAlert';
import { LibraryContactSection } from '../../components/student/LibraryContactSection';
import { getGlobalSettings, isValidHttpUrl, toApiErrorMessage } from '../../services/globalSettings';
import { APP_DISPLAY_NAME } from '../../constants/branding';
import { imageCacheKey } from '../../utils/imageUrl';

export default function StudentSettingsScreen({ navigation }: { navigation: any }) {
  const { mode, preference } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);

  const themeModeLabel =
    preference === 'system' ? 'System' : preference === 'dark' ? 'Dark' : 'Light';

  const openAppearance = () => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) parent.navigate('Appearance');
    else navigation.navigate('Appearance');
  };

  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const fetchMyProfile = useAppStore((s) => s.fetchMyProfile);

  const [infoAlert, setInfoAlert] = useState<{
    title: string;
    message?: string;
    tone?: SimpleAlertTone;
  } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const showAlert = (title: string, message?: string, tone: SimpleAlertTone = 'info') => {
    setInfoAlert({ title, message, tone });
  };

  const name = (currentUser?.name ?? 'Student').toUpperCase();
  const mobile = (currentUser as any)?.mobile ?? '';
  const username = (currentUser as any)?.username ?? '';
  const photoUrl = String((currentUser as any)?.photoUrl || '').trim();

  useEffect(() => {
    if (currentUser?.role === 'student') void fetchMyProfile();
  }, [currentUser?.role, fetchMyProfile]);

  const onLogout = () => setShowLogoutModal(true);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView style={styles.safe} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image key={imageCacheKey(photoUrl)} source={{ uri: photoUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarTxt}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.profileName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.profileSub} numberOfLines={1}>
            {username ? `@${username}` : ''}
            {mobile ? (username ? `  ·  ${mobile}` : mobile) : ''}
          </Text>
        </View>

        <Section title="APPEARANCE">
          <Item
            icon="moon-outline"
            title="Theme Mode"
            sub={`Currently: ${themeModeLabel}`}
            onPress={openAppearance}
            last
          />
        </Section>

        <Section title="ACCOUNT">
          <Item icon="person-outline" title="Profile" sub="View your profile" onPress={() => navigation.getParent()?.navigate('StudentProfile')} />
        </Section>

        <Section title="SUBSCRIPTION">
          <Item
            icon="calendar-outline"
            title="Renew Plan"
            sub="Request membership renewal"
            onPress={() => navigation.getParent()?.navigate('RenewPlan')}
          />
          <Item
            icon="wallet-outline"
            title="Payment History"
            sub="View payments & invoices"
            onPress={() => navigation.getParent()?.navigate('PaymentHistory')}
            last
          />
        </Section>

        <LibraryContactSection
          studentName={currentUser?.name}
          studentUsername={(currentUser as { username?: string })?.username}
          onAlert={showAlert}
        />

        <Section title="LEGAL">
          <Item
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            sub="View policy"
            onPress={async () => {
              try {
                const s = await getGlobalSettings();
                const url = String(s.privacyPolicyUrl || '').trim();
                if (!isValidHttpUrl(url)) {
                  showAlert('Not configured', 'Privacy Policy link is not set yet.', 'warning');
                  return;
                }
                navigation.getParent()?.navigate('StudentLegalWebView', { title: 'Privacy Policy', url });
              } catch (e) {
                showAlert('Failed', toApiErrorMessage(e), 'error');
              }
            }}
          />
          <Item
            icon="document-text-outline"
            title="Terms & Conditions"
            sub="View terms"
            onPress={async () => {
              try {
                const s = await getGlobalSettings();
                const url = String(s.termsUrl || '').trim();
                if (!isValidHttpUrl(url)) {
                  showAlert('Not configured', 'Terms link is not set yet.', 'warning');
                  return;
                }
                navigation.getParent()?.navigate('StudentLegalWebView', { title: 'Terms & Conditions', url });
              } catch (e) {
                showAlert('Failed', toApiErrorMessage(e), 'error');
              }
            }}
          />
          <Item
            icon="information-circle-outline"
            title="About App"
            sub="Version & info"
            onPress={() => showAlert('About', `${APP_DISPLAY_NAME} (Student) v1.0.0`, 'info')}
            last
          />
        </Section>

        {/* Premium logout CTA (centered) */}
        <View style={styles.logoutWrap}>
          <TouchableOpacity activeOpacity={0.9} onPress={onLogout} style={styles.logoutBtn}>
            <LinearGradient
              colors={['#EF4444', '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutGrad}
            >
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.logoutTxt}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.logoutHint}>You can sign in again anytime.</Text>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showLogoutModal}
        tone="primary"
        label="CONFIRM"
        title="Logout?"
        description="Are you sure you want to sign out?"
        cancelText="Cancel"
        confirmText="Logout"
        confirmIcon="log-out-outline"
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
      />

      <SimpleAlert
        visible={!!infoAlert}
        tone={infoAlert?.tone ?? 'info'}
        title={infoAlert?.title ?? ''}
        message={infoAlert?.message}
        onClose={() => setInfoAlert(null)}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ marginLeft: 16, marginBottom: 8, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, color: theme.colors.mutedText }}>
        {title}
      </Text>
      <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Item(props: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const { danger, last } = props;
  const fg = danger ? theme.colors.danger : theme.colors.text;
  const sub = danger ? theme.colors.danger + 'AA' : theme.colors.mutedText;
  return (
    <TouchableOpacity onPress={props.onPress} activeOpacity={0.86} style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: danger ? 'rgba(239,68,68,0.12)' : theme.colors.background,
          borderWidth: 1,
          borderColor: danger ? 'rgba(239,68,68,0.24)' : theme.colors.border,
        }}
      >
        <Ionicons name={props.icon} size={18} color={fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: fg }} numberOfLines={1}>
          {props.title}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 12, fontWeight: '700', color: sub }} numberOfLines={1}>
          {props.sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={sub} />
      {!last ? <View style={{ position: 'absolute', left: 64, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} /> : null}
    </TouchableOpacity>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: 28 },
    profileCard: {
      marginHorizontal: 12,
      marginTop: 14,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      gap: 8,
      ...theme.shadow.card,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99,102,241,0.28)' : '#C7D2FE',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: 64, height: 64, borderRadius: 22 },
    avatarTxt: { fontSize: 26, fontWeight: '900', color: theme.colors.primary },
    profileName: { marginTop: 4, fontSize: 17, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.2, textAlign: 'center' },
    profileSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText, textAlign: 'center' },

    logoutWrap: { marginTop: 18, paddingHorizontal: 12, alignItems: 'center' },
    logoutBtn: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.35)',
      ...theme.shadow.card,
    },
    logoutGrad: {
      height: 52,
      borderRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 18,
    },
    logoutTxt: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
    logoutHint: { marginTop: 10, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText, textAlign: 'center' },
  });
}

