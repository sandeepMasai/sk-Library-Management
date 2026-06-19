import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import {
  getLibraryContact,
  openLibraryChannel,
  openLibraryEmail,
  openLibraryPhone,
  openLibraryWhatsApp,
  openLibraryWhatsAppGroup,
  toApiErrorMessage,
  type LibraryContact,
} from '../../services/libraryContact';
import type { SimpleAlertTone } from '../SimpleAlert';
import { useAppStore } from '../../store';

type Props = {
  studentName?: string;
  studentUsername?: string;
  onAlert: (title: string, message?: string, tone?: SimpleAlertTone) => void;
};

type ContactRowStyles = ReturnType<typeof makeStyles>;

export function LibraryContactSection({ studentName, studentUsername, onAlert }: Props) {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const libraryId = useAppStore((s) => s.libraryId);
  const [contact, setContact] = useState<LibraryContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!libraryId) {
      setContact(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getLibraryContact({ libraryId })
      .then((c) => {
        if (!cancelled) setContact(c);
      })
      .catch(() => {
        if (!cancelled) setContact(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  const ctx = { studentName, studentUsername };
  const comm = contact?.communication;
  const hasAny =
    Boolean(contact?.libraryName) ||
    Boolean(contact?.address) ||
    Boolean(comm?.whatsapp) ||
    Boolean(comm?.phone) ||
    Boolean(comm?.channel) ||
    Boolean(comm?.email) ||
    Boolean(comm?.whatsappGroup);

  const run = async (fn: () => Promise<void>, fallbackTitle: string) => {
    try {
      await fn();
    } catch (e) {
      onAlert(fallbackTitle, toApiErrorMessage(e), 'error');
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CONTACT LIBRARY</Text>
      <View style={styles.card}>
        {loading ? (
          <Text style={styles.hint}>Loading contact details…</Text>
        ) : !hasAny ? (
          <Text style={styles.hint}>
            Your library has not added contact details yet. Ask the library admin to add WhatsApp or phone in their
            profile.
          </Text>
        ) : (
          <>
            {contact?.libraryName ? (
              <View style={styles.libraryHeader}>
                <Text style={styles.libraryName}>{contact.libraryName}</Text>
                {contact.address ? (
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.mutedText} />
                    <Text style={styles.libraryAddress}>{contact.address}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {comm?.whatsapp ? (
              <ContactRow
                styles={styles}
                icon="logo-whatsapp"
                iconColor="#25D366"
                label="WhatsApp"
                value="Chat with library"
                onPress={() => run(() => openLibraryWhatsApp(contact!, ctx), 'WhatsApp')}
              />
            ) : null}
            {comm?.phone ? (
              <ContactRow
                styles={styles}
                icon="call-outline"
                iconColor="#6366F1"
                label="Phone"
                value={comm.phone}
                onPress={() => run(() => openLibraryPhone(contact!), 'Phone')}
              />
            ) : null}
            {comm?.whatsappGroup ? (
              <ContactRow
                styles={styles}
                icon="people-outline"
                iconColor="#25D366"
                label="WhatsApp Group"
                value="Join library group"
                onPress={() => run(() => openLibraryWhatsAppGroup(contact!), 'WhatsApp Group')}
              />
            ) : null}
            {comm?.channel ? (
              <ContactRow
                styles={styles}
                icon="megaphone-outline"
                iconColor="#0EA5E9"
                label="Channel"
                value="Announcements & updates"
                onPress={() => run(() => openLibraryChannel(contact!), 'Channel')}
              />
            ) : null}
            {comm?.email ? (
              <ContactRow
                styles={styles}
                icon="mail-outline"
                iconColor="#6366F1"
                label="Email"
                value={comm.email}
                onPress={() => run(() => openLibraryEmail(contact!), 'Email')}
                last
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function ContactRow({
  styles: s,
  icon,
  iconColor,
  label,
  value,
  onPress,
  last,
}: {
  styles: ContactRowStyles;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.row, !last && s.rowBorder]}
    >
      <View style={[s.iconBox, { backgroundColor: iconColor + s.iconTintAlpha, borderColor: iconColor + s.iconBorderAlpha }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedText} />
    </TouchableOpacity>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';
  const iconTintAlpha = isDark ? '30' : '18';
  const iconBorderAlpha = isDark ? '45' : '28';

  const sheet = StyleSheet.create({
    section: { marginTop: 16, paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: theme.colors.mutedText,
      marginBottom: 8,
      marginLeft: 2,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      ...(isDark
        ? {}
        : {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }),
    },
    hint: {
      padding: 14,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.mutedText,
      lineHeight: 19,
    },
    libraryHeader: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    libraryName: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.colors.text,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 6,
    },
    libraryAddress: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.mutedText,
      lineHeight: 17,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: 'transparent',
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    rowBody: { flex: 1, minWidth: 0 },
    rowLabel: { fontSize: 14, fontWeight: '900', color: theme.colors.text },
    rowValue: { marginTop: 2, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText },
  });

  return { ...sheet, iconTintAlpha, iconBorderAlpha };
}
