import React, { useLayoutEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { differenceInDays, format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useScrollBottomForTabBar } from '../../hooks/useScrollBottomForTabBar';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Read-only student profile for library admin.
 * Edit opens `AdminStudentForm` only from the header or list card "Edit" action.
 */
export default function AdminStudentDetail() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const scrollBottom = useScrollBottomForTabBar();

  const studentId = String(route.params?.studentId ?? '').trim();
  const users = useAppStore((s) => s.users);
  const student = useMemo(
    () => (studentId ? users.find((u) => u.id === studentId && u.role === 'student') : undefined),
    [users, studentId]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: student?.name ? student.name : 'Student',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => studentId && navigation.navigate('AdminStudentForm', { studentId })}
          disabled={!studentId || !student}
          style={{ paddingHorizontal: 12, paddingVertical: 8, opacity: student ? 1 : 0.4 }}
          hitSlop={12}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 16 }}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, studentId, student, student?.name]);

  if (!studentId) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <Text style={styles.muted}>Missing student.</Text>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <Ionicons name="person-off-outline" size={48} color={theme.colors.mutedText} />
        <Text style={styles.emptyTitle}>Student not found</Text>
        <Text style={styles.muted}>They may have been removed. Go back and refresh the list.</Text>
      </SafeAreaView>
    );
  }

  const daysLeft = differenceInDays(new Date(student.expiryDate), new Date());
  const isExpired = daysLeft < 0;
  const isActive = !isExpired && !student.isBlocked;
  const feeMethodLabel = student.feeMethod === 'upi' ? 'UPI' : 'Cash';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollBottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        {student.photoUrl ? (
          <Image source={{ uri: student.photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.username}>@{student.username}</Text>
        <StatusLine isActive={isActive} isBlocked={student.isBlocked} isExpired={isExpired} />
      </View>

      <View style={styles.card}>
        <SectionTitle>Contact</SectionTitle>
        <ReadRow icon="call-outline" label="Mobile" value={student.mobile} />
        <ReadRow icon="at-outline" label="Username" value={student.username} />
      </View>

      <View style={styles.card}>
        <SectionTitle>Membership</SectionTitle>
        <ReadRow icon="calendar-outline" label="Joined" value={format(new Date(student.joinDate), 'dd MMM yyyy')} />
        <ReadRow icon="calendar-outline" label="Valid until" value={format(new Date(student.expiryDate), 'dd MMM yyyy')} />
        <ReadRow
          icon="time-outline"
          label="Status"
          value={isExpired ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          valueColor={isExpired ? theme.colors.danger : daysLeft <= 7 ? theme.colors.warning : theme.colors.success}
        />
        <ReadRow
          icon="shield-outline"
          label="Access"
          value={student.isBlocked ? 'Blocked' : isExpired ? 'Expired' : 'Active'}
        />
      </View>

      <View style={styles.card}>
        <SectionTitle>Fees</SectionTitle>
        <ReadRow icon="cash-outline" label="Amount" value={`₹${student.feeAmount}`} />
        <ReadRow icon="pricetag-outline" label="Payment status" value={student.feeStatus} />
        <ReadRow icon="card-outline" label="Method" value={feeMethodLabel} />
      </View>

      <Text style={styles.hint}>Tap Edit in the top bar to change this member.</Text>
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: string }) {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ReadRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={theme.colors.mutedText} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      </View>
    </View>
  );
}

function StatusLine({
  isActive,
  isBlocked,
  isExpired,
}: {
  isActive: boolean;
  isBlocked: boolean;
  isExpired: boolean;
}) {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  let label = 'Active';
  let color = theme.colors.success;
  if (isBlocked) {
    label = 'Blocked';
    color = theme.colors.danger;
  } else if (isExpired) {
    label = 'Expired';
    color = theme.colors.warning;
  } else if (!isActive) {
    label = 'Inactive';
    color = theme.colors.mutedText;
  }
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function makeStyles(_mode: 'light' | 'dark') {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.md, paddingTop: 12 },
    center: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
    muted: { color: theme.colors.mutedText, textAlign: 'center', fontWeight: '600', lineHeight: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginTop: 8 },
    hero: { alignItems: 'center', marginBottom: theme.spacing.md },
    photo: { width: 88, height: 88, borderRadius: 22, backgroundColor: theme.colors.surface },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 32, fontWeight: '800', color: theme.colors.primary },
    name: { marginTop: 12, fontSize: 22, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
    username: { marginTop: 4, fontSize: 14, fontWeight: '600', color: theme.colors.mutedText },
    pill: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { fontSize: 12, fontWeight: '800' },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.colors.mutedText,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 12,
    },
    row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    rowIcon: { marginRight: 12, marginTop: 2 },
    rowText: { flex: 1, minWidth: 0 },
    rowLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginBottom: 2 },
    rowValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    hint: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.mutedText,
      marginTop: 8,
      paddingHorizontal: 12,
      lineHeight: 18,
    },
  });
}
