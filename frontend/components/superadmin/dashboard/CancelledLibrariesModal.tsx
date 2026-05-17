import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../../../theme';

export type CancelledLibraryRow = {
  id: string;
  libraryId: string;
  name: string;
  ownerName: string;
  email: string;
  libraryCode: string | null;
  plan: string;
  planLabel: string;
  expiryDate: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelNote: string | null;
  isActive: boolean;
};

type Props = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  libraries: CancelledLibraryRow[];
  onClose: () => void;
  onRetry: () => void;
  onSelectLibrary?: (libraryId: string) => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CancelledLibrariesModal({
  visible,
  loading,
  error,
  libraries,
  onClose,
  onRetry,
  onSelectLibrary,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { borderColor, backgroundColor: surfaceColor }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.overline, { color: mutedColor }]}>Subscriptions</Text>
              <Text style={[styles.title, { color: textColor }]}>Cancelled libraries</Text>
              <Text style={[styles.sub, { color: mutedColor }]}>
                {libraries.length} plan{libraries.length === 1 ? '' : 's'} cancelled on the platform
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <X size={22} color={textColor} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.muted, { color: mutedColor }]}>Loading cancelled libraries…</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{error}</Text>
              <TouchableOpacity style={[styles.retryBtn, { borderColor }]} onPress={onRetry}>
                <Text style={{ color: textColor, fontWeight: '800' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : libraries.length === 0 ? (
            <View style={styles.center}>
              <Text style={[styles.emptyTitle, { color: textColor }]}>No cancelled plans</Text>
              <Text style={[styles.muted, { color: mutedColor }]}>All library subscriptions are active or expired only.</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {libraries.map((lib) => (
                <TouchableOpacity
                  key={lib.id}
                  activeOpacity={onSelectLibrary ? 0.85 : 1}
                  style={[styles.card, { borderColor, backgroundColor: surfaceColor }]}
                  onPress={() => onSelectLibrary?.(lib.libraryId)}
                  disabled={!onSelectLibrary}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.libName, { color: textColor }]} numberOfLines={1}>
                      {lib.name}
                    </Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeTxt}>Cancelled</Text>
                    </View>
                  </View>
                  <Text style={[styles.meta, { color: mutedColor }]} numberOfLines={1}>
                    {lib.ownerName} · {lib.email}
                  </Text>
                  <View style={styles.row}>
                    <Text style={[styles.lbl, { color: mutedColor }]}>Plan</Text>
                    <Text style={[styles.val, { color: textColor }]}>{lib.planLabel}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.lbl, { color: mutedColor }]}>Cancelled on</Text>
                    <Text style={[styles.val, { color: textColor }]}>{fmtDate(lib.cancelledAt)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.lbl, { color: mutedColor }]}>Plan expiry</Text>
                    <Text style={[styles.val, { color: textColor }]}>{fmtDate(lib.expiryDate)}</Text>
                  </View>
                  {lib.cancelReason ? (
                    <Text style={[styles.reason, { color: mutedColor }]} numberOfLines={2}>
                      Reason: {lib.cancelReason}
                    </Text>
                  ) : null}
                  {lib.libraryCode ? (
                    <Text style={[styles.code, { color: mutedColor }]}>Code: {lib.libraryCode}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: theme.spacing.md,
    ...Platform.select({
      web: { maxWidth: 560, alignSelf: 'center', width: '100%' } as object,
    }),
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  overline: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  sub: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  center: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  muted: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  list: { maxHeight: 420 },
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  libName: { flex: 1, fontSize: 16, fontWeight: '900' },
  badge: {
    backgroundColor: 'rgba(100,116,139,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  meta: { fontSize: 12, fontWeight: '600', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  lbl: { fontSize: 12, fontWeight: '700' },
  val: { fontSize: 12, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  reason: { marginTop: 8, fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
  code: { marginTop: 4, fontSize: 11, fontWeight: '700' },
});
