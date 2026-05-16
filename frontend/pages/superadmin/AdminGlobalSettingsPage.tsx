import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPut, type ApiError } from '../../services/api';
import {
  parseGlobalSettingsPayload,
  isValidHttpUrl,
  clearGlobalSettingsCache,
  formatSettingsUpdatedAt,
} from '../../services/globalSettings';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { ConfirmModal } from '../../components/ConfirmModal';

function applySettingsToForm(
  settings: ReturnType<typeof parseGlobalSettingsPayload>,
  setters: {
    setPrivacyPolicyUrl: (v: string) => void;
    setTermsUrl: (v: string) => void;
    setWhatsapp: (v: string) => void;
    setChannel: (v: string) => void;
    setEmail: (v: string) => void;
    setUpdatedAt: (v: string | null) => void;
    setSavedEmail: (v: string) => void;
  }
) {
  setters.setPrivacyPolicyUrl(settings.privacyPolicyUrl);
  setters.setTermsUrl(settings.termsUrl);
  setters.setWhatsapp(settings.communication.whatsapp);
  setters.setChannel(settings.communication.channel);
  setters.setEmail(settings.communication.email);
  setters.setSavedEmail(settings.communication.email);
  setters.setUpdatedAt(settings.updatedAt);
}

export default function AdminGlobalSettingsPage() {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [channel, setChannel] = useState('');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [emailJustSaved, setEmailJustSaved] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; description?: string } | null>(null);

  const updatedLabel = useMemo(() => formatSettingsUpdatedAt(updatedAt), [updatedAt]);
  const emailDirty = email.trim().toLowerCase() !== savedEmail.trim().toLowerCase();

  const load = useCallback(async () => {
    setLoading(true);
    setEmailJustSaved(false);
    try {
      await clearGlobalSettingsCache();
      const data = await apiGet('/api/settings');
      applySettingsToForm(parseGlobalSettingsPayload(data), {
        setPrivacyPolicyUrl,
        setTermsUrl,
        setWhatsapp,
        setChannel,
        setEmail,
        setUpdatedAt,
        setSavedEmail,
      });
    } catch (e: any) {
      const err = e as ApiError;
      setInfoModal({ title: 'Failed to load', description: err.message || 'Could not load settings.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const p = privacyPolicyUrl.trim();
    const t = termsUrl.trim();
    const w = whatsapp.trim();
    const c = channel.trim();
    const e = email.trim().toLowerCase();
    if (!p || !t) {
      setInfoModal({ title: 'Required', description: 'Please enter both Privacy Policy URL and Terms URL.' });
      return;
    }
    if (!isValidHttpUrl(p) || !isValidHttpUrl(t)) {
      setInfoModal({
        title: 'Invalid URL',
        description: 'Privacy and Terms URLs must start with http:// or https://',
      });
      return;
    }
    if (c && !isValidHttpUrl(c)) {
      setInfoModal({
        title: 'Invalid channel link',
        description: 'Channel link must be a full URL starting with http:// or https://',
      });
      return;
    }
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setInfoModal({ title: 'Invalid email', description: 'Enter a valid support email address.' });
      return;
    }
    setSaving(true);
    setEmailJustSaved(false);
    try {
      const prevSaved = savedEmail.trim().toLowerCase();
      const data = await apiPut('/api/settings', {
        privacyPolicyUrl: p,
        termsUrl: t,
        communication: { whatsapp: w, channel: c, email: e },
      });
      const parsed = parseGlobalSettingsPayload(data);
      applySettingsToForm(parsed, {
        setPrivacyPolicyUrl,
        setTermsUrl,
        setWhatsapp,
        setChannel,
        setEmail,
        setUpdatedAt,
        setSavedEmail,
      });
      await clearGlobalSettingsCache();
      const newEmail = parsed.communication.email.trim().toLowerCase();
      if (newEmail && newEmail !== prevSaved) {
        setEmailJustSaved(true);
      }
      setInfoModal({
        title: 'Saved',
        description: newEmail
          ? `Support email updated to ${newEmail}. Students and libraries will see this address.`
          : 'Settings updated successfully.',
      });
    } catch (err: unknown) {
      const e = err as ApiError;
      setInfoModal({ title: 'Save failed', description: e.message || 'Could not save settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView style={styles.safe} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="link-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroTitle}>Global URLs & support</Text>
            <Text style={styles.heroSub}>Privacy, terms, WhatsApp, channel, and support email.</Text>
            {updatedLabel ? <Text style={styles.heroMeta}>Last saved: {updatedLabel}</Text> : null}
          </View>
          <TouchableOpacity onPress={load} activeOpacity={0.85} style={styles.refreshBtn} disabled={loading || saving}>
            <Ionicons name="refresh-outline" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {!loading && savedEmail ? (
          <View style={styles.currentEmailCard}>
            <View style={styles.currentEmailIcon}>
              <Ionicons name="mail" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.currentEmailLabel}>Current support email</Text>
              <Text style={styles.currentEmailValue} numberOfLines={2} selectable>
                {savedEmail}
              </Text>
            </View>
            <View style={styles.livePill}>
              <Text style={styles.livePillTxt}>Live</Text>
            </View>
          </View>
        ) : null}

        {emailJustSaved && savedEmail ? (
          <View style={styles.savedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.savedBannerTxt} numberOfLines={3}>
              Support email updated to{' '}
              <Text style={styles.savedBannerEmail}>{savedEmail}</Text>
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingTxt}>Loading…</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Legal links</Text>

            <Text style={styles.label}>PRIVACY POLICY URL</Text>
            <View style={styles.inputShell}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.mutedText} />
              <TextInput
                value={privacyPolicyUrl}
                onChangeText={setPrivacyPolicyUrl}
                placeholder="https://example.com/privacy"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>TERMS URL</Text>
            <View style={styles.inputShell}>
              <Ionicons name="document-text-outline" size={18} color={theme.colors.mutedText} />
              <TextInput
                value={termsUrl}
                onChangeText={setTermsUrl}
                placeholder="https://example.com/terms"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Communication</Text>

            <Text style={styles.label}>WHATSAPP NUMBER</Text>
            <View style={styles.inputShell}>
              <Ionicons name="logo-whatsapp" size={18} color={theme.colors.mutedText} />
              <TextInput
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="919999999999"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>CHANNEL LINK</Text>
            <View style={styles.inputShell}>
              <Ionicons name="megaphone-outline" size={18} color={theme.colors.mutedText} />
              <TextInput
                value={channel}
                onChangeText={setChannel}
                placeholder="https://whatsapp.com/channel/xxx"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>SUPPORT EMAIL</Text>
            <Text style={styles.fieldHint}>Shown in app support — students can tap to email you.</Text>
            <View
              style={[
                styles.inputShell,
                emailDirty && styles.inputShellDirty,
                savedEmail && !emailDirty && styles.inputShellSaved,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={savedEmail && !emailDirty ? '#059669' : theme.colors.mutedText}
              />
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setEmailJustSaved(false);
                }}
                placeholder="support@yourapp.com"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
            {emailDirty ? (
              <Text style={styles.unsavedHint}>Unsaved changes — tap Save to update support email.</Text>
            ) : savedEmail ? (
              <View style={styles.savedRow}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.savedRowTxt} numberOfLines={2}>
                  Saved: {savedEmail}
                </Text>
              </View>
            ) : (
              <Text style={styles.fieldHint}>No support email set yet.</Text>
            )}

            <TouchableOpacity onPress={save} activeOpacity={0.9} style={[styles.saveBtn, saving && { opacity: 0.7 }]} disabled={saving}>
              <Ionicons name={saving ? 'time-outline' : 'save-outline'} size={18} color="#fff" />
              <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save changes'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!infoModal}
        tone="neutral"
        label="INFO"
        title={infoModal?.title ?? 'Info'}
        description={infoModal?.description}
        showCancel={false}
        confirmText="OK"
        confirmIcon="checkmark-outline"
        onCancel={() => setInfoModal(null)}
        onConfirm={() => setInfoModal(null)}
      />
    </SafeAreaView>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 28 },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadow.card,
    },
    heroIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99,102,241,0.28)' : '#C7D2FE',
    },
    heroTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text },
    heroSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText, lineHeight: 17 },
    heroMeta: { marginTop: 4, fontSize: 11, fontWeight: '700', color: '#0d9488' },
    refreshBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentEmailCard: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(52,211,153,0.35)' : '#a7f3d0',
    },
    currentEmailIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentEmailLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.colors.mutedText,
      textTransform: 'uppercase',
    },
    currentEmailValue: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#34d399' : '#047857',
      lineHeight: 20,
    },
    livePill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(16,185,129,0.25)' : '#d1fae5',
      borderWidth: 1,
      borderColor: '#059669',
    },
    livePillTxt: { fontSize: 10, fontWeight: '900', color: '#059669', letterSpacing: 0.5 },
    savedBanner: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(16,185,129,0.14)' : '#f0fdf4',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(52,211,153,0.3)' : '#bbf7d0',
    },
    savedBannerTxt: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
      lineHeight: 19,
    },
    savedBannerEmail: { fontWeight: '900', color: '#059669' },
    loadingRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
    loadingTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.mutedText },
    card: {
      marginTop: 14,
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadow.card,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: theme.colors.text,
      marginBottom: 12,
    },
    label: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, color: theme.colors.mutedText },
    fieldHint: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.mutedText,
      lineHeight: 17,
    },
    inputShell: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.background,
      minHeight: 50,
    },
    inputShellDirty: {
      borderColor: '#d97706',
      backgroundColor: isDark ? 'rgba(217,119,6,0.08)' : '#fffbeb',
    },
    inputShellSaved: {
      borderColor: '#059669',
      backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4',
    },
    input: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text, paddingVertical: 12, minWidth: 0 },
    unsavedHint: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '700',
      color: '#d97706',
    },
    savedRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    savedRowTxt: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: '#059669',
      lineHeight: 17,
    },
    saveBtn: {
      marginTop: 18,
      height: 50,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    saveTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
  });
}
