import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { X, User, Phone, Mail, Building2, Armchair, Clock, MapPin, Percent } from 'lucide-react-native';
import { apiGet, type ApiError } from '../../../services/api';
import { theme } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';
import type { StudentDetail, StudentsStackParamList } from './types';

type Rt = RouteProp<StudentsStackParamList, 'StudentDetail'>;

export default function AdminStudentDetailModal() {
  const navigation = useNavigation();
  const route = useRoute<Rt>();
  const { studentId } = route.params;
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ ok: boolean; student: StudentDetail }>(`/api/superadmin/students/${studentId}`);
      setDetail(res.student);
    } catch (e) {
      const err = e as ApiError;
      setError(err?.message || 'Failed to load student');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const colors = useMemo(
    () => ({
      bg: isDark ? '#0B1220' : '#F8FAFC',
      surface: isDark ? '#131A2B' : '#FFFFFF',
      border: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
      text: isDark ? '#F8FAFC' : '#0F172A',
      muted: isDark ? '#94A3B8' : '#64748B',
    }),
    [isDark]
  );

  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => navigation.goBack()}>
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.sheetHead, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Student profile</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.closeBtn, { borderColor: colors.border }]}>
              <X size={20} color={colors.muted} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : error || !detail ? (
            <View style={styles.center}>
              <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>{error || 'Not found'}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <View style={[styles.hero, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{detail.fullName.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{detail.fullName}</Text>
                  <View style={[styles.statusPill, detail.isActive ? styles.on : styles.off]}>
                    <Text style={[styles.statusTxt, detail.isActive ? styles.onTxt : styles.offTxt]}>
                      {detail.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              <Section title="Contact">
                <InfoRow icon={<User size={16} color={colors.muted} />} label="Full name" value={detail.fullName} colors={colors} />
                <InfoRow icon={<Phone size={16} color={colors.muted} />} label="Phone" value={detail.phone} colors={colors} />
                <InfoRow icon={<Mail size={16} color={colors.muted} />} label="Email" value={detail.email || '—'} colors={colors} />
                <InfoRow icon={<Building2 size={16} color={colors.muted} />} label="Library" value={detail.libraryName} colors={colors} />
                <InfoRow icon={<MapPin size={16} color={colors.muted} />} label="Address" value={detail.address || '—'} colors={colors} />
              </Section>

              <Section title="Seat & plan">
                <InfoRow icon={<Armchair size={16} color={colors.muted} />} label="Seat" value={detail.seatNumber || '—'} colors={colors} />
                <InfoRow icon={<Clock size={16} color={colors.muted} />} label="Timing" value={detail.timing || '—'} colors={colors} />
                <InfoRow
                  label="Plan duration"
                  value={detail.planDurationDays ? `${detail.planDurationDays} days` : '—'}
                  colors={colors}
                />
                <InfoRow
                  label="Join date"
                  value={detail.joinDate ? format(new Date(detail.joinDate), 'dd MMM yyyy') : '—'}
                  colors={colors}
                />
                <InfoRow
                  label="Expiry date"
                  value={detail.expiryDate ? format(new Date(detail.expiryDate), 'dd MMM yyyy') : '—'}
                  colors={colors}
                />
              </Section>

              <Section title="Attendance">
                <InfoRow
                  icon={<Percent size={16} color={colors.muted} />}
                  label="Last 30 days"
                  value={`${detail.attendancePercent}% (${detail.attendancePresentDays} days)`}
                  colors={colors}
                />
              </Section>

              <Section title="Payment history">
                {detail.paymentHistory.map((p) => (
                  <View key={p.id} style={[styles.payRow, { borderColor: colors.border }]}>
                    <Text style={[styles.payLabel, { color: colors.text }]}>{p.label}</Text>
                    <Text style={[styles.payMeta, { color: colors.muted }]}>
                      ₹{p.amount} · {p.status} · {p.method}
                    </Text>
                    <Text style={[styles.payDate, { color: colors.muted }]}>
                      {p.date ? format(new Date(p.date), 'dd MMM yyyy') : '—'}
                    </Text>
                  </View>
                ))}
              </Section>

              {detail.notes ? (
                <Section title="Notes">
                  <Text style={[styles.notes, { color: colors.muted }]}>{detail.notes}</Text>
                </Section>
              ) : null}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  colors: { text: string; muted: string };
}) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.infoLbl, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.infoVal, { color: colors.text }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, paddingBottom: 40 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: '#fff', fontWeight: '900', fontSize: 18 },
  name: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  on: { backgroundColor: 'rgba(5,150,105,0.12)' },
  off: { backgroundColor: 'rgba(220,38,38,0.1)' },
  statusTxt: { fontSize: 11, fontWeight: '900' },
  onTxt: { color: '#059669' },
  offTxt: { color: '#DC2626' },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  infoLbl: { fontSize: 11, fontWeight: '700' },
  infoVal: { marginTop: 2, fontSize: 14, fontWeight: '700' },
  payRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  payLabel: { fontSize: 14, fontWeight: '800' },
  payMeta: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  payDate: { marginTop: 2, fontSize: 11, fontWeight: '600' },
  notes: { fontSize: 14, fontWeight: '600', lineHeight: 21 },
  center: { padding: 48, alignItems: 'center' },
  retryBtn: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#0F172A' },
  retryTxt: { color: '#fff', fontWeight: '900' },
});
