import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Print from 'expo-print';
import { useAppStore } from '../../store';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useScrollBottomForTabBar } from '../../hooks/useScrollBottomForTabBar';
import { useTheme } from '../../theme/ThemeProvider';
import { apiGet } from '../../services/api';
import {
  AttendanceEntryRow,
  type AttendanceEntryRowData,
  type AttendanceEntryRowStyles,
} from '../../components/attendance/AttendanceEntryRow';
import { AttendanceListHeader } from '../../components/attendance/AttendanceListHeader';

const QR_IMAGE = (token: string, size: number) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(token)}`;

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 5000;

type BlockedAttempt = {
  id: string;
  studentName: string;
  membershipExpiryDate: string | null;
  attemptedAt: string | null;
  reason: string;
};

const ListSeparator = () => <View style={separatorStyle.separator} />;
const separatorStyle = StyleSheet.create({ separator: { height: 8 } });

const EmptyCheckIns = React.memo(function EmptyCheckIns({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyCircle}>
        <Ionicons name="checkmark-done-outline" size={32} color={theme.colors.mutedText} />
      </View>
      <Text style={styles.emptyTitle}>No check-ins yet</Text>
      <Text style={styles.emptySub}>Nobody has scanned for this day.</Text>
    </View>
  );
});

export default function AdminAttendance() {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const rowStyles = useMemo<AttendanceEntryRowStyles>(
    () => ({
      entryCard: styles.entryCard,
      entryAvatar: styles.entryAvatar,
      entryAvatarImg: styles.entryAvatarImg,
      entryAvatarTxt: styles.entryAvatarTxt,
      entryUsername: styles.entryUsername,
      entryTime: styles.entryTime,
      presentBadge: styles.presentBadge,
      presentTxt: styles.presentTxt,
    }),
    [styles]
  );

  const scrollBottom = useScrollBottomForTabBar();

  const dailyQrToken = useAppStore((state) => state.dailyQrToken);
  const generateDailyQr = useAppStore((state) => state.generateDailyQr);
  const fetchAttendanceByDate = useAppStore((state) => state.fetchAttendanceByDate);
  const fetchStudents = useAppStore((state) => state.fetchStudents);
  const attendances = useAppStore((state) => state.attendances);
  const users = useAppStore((state) => state.users);

  const { studentCount, studentsById } = useMemo(() => {
    const map = new Map<string, { username: string; name: string; photoUrl?: string | null }>();
    let count = 0;
    for (const u of users) {
      if (u.role === 'student') {
        count += 1;
        map.set(u.id, { username: u.username, name: u.name, photoUrl: u.photoUrl });
      }
    }
    return { studentCount: count, studentsById: map };
  }, [users]);

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [printing, setPrinting] = useState(false);
  const [blockedAttempts, setBlockedAttempts] = useState<BlockedAttempt[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);

  const loadBlockedAttempts = useCallback(async () => {
    setBlockedLoading(true);
    try {
      const res = await apiGet<{ ok: boolean; attempts: BlockedAttempt[] }>(`/api/attendance/blocked-attempts`, {
        limit: 30,
      });
      setBlockedAttempts(Array.isArray(res.attempts) ? res.attempts : []);
    } catch {
      setBlockedAttempts([]);
    } finally {
      setBlockedLoading(false);
    }
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const selectedDateObj = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate]);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  const enrichedRows = useMemo((): AttendanceEntryRowData[] => {
    const sorted = [...attendances].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted.map((item) => {
      const student = studentsById.get(item.studentId);
      const name = item.studentName?.trim() || student?.name || 'Student';
      return {
        id: item.id,
        studentName: name,
        displayInitial: name.charAt(0).toUpperCase(),
        photoUrl: item.photoUrl ?? student?.photoUrl,
        formattedTime: format(new Date(item.date), 'h:mm a'),
      };
    });
  }, [attendances, studentsById]);

  const visibleRows = useMemo(
    () => enrichedRows.slice(0, visibleCount),
    [enrichedRows, visibleCount]
  );

  const attendanceRatio = useMemo(() => {
    return studentCount > 0 ? Math.round((attendances.length / studentCount) * 100) : 0;
  }, [attendances.length, studentCount]);

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        generateDailyQr(),
        fetchStudents(),
        fetchAttendanceByDate(format(new Date(), 'yyyy-MM-dd')),
        loadBlockedAttempts(),
      ]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const poll = () => {
      if (AppState.currentState === 'active') {
        fetchAttendanceByDate(selectedDateRef.current);
      }
    };
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAttendanceByDate]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') fetchAttendanceByDate(selectedDateRef.current);
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [fetchAttendanceByDate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        generateDailyQr(),
        fetchStudents(),
        fetchAttendanceByDate(selectedDate),
        loadBlockedAttempts(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAttendanceByDate, selectedDate, loadBlockedAttempts, generateDailyQr]);

  const handlePrint = useCallback(async () => {
    if (!dailyQrToken) {
      Alert.alert('QR not ready', 'Generate the code first.');
      return;
    }
    setPrinting(true);
    try {
      const src = QR_IMAGE(dailyQrToken, 400);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
        <body style="margin:0;padding:32px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
          <p style="font-size:14px;color:#334155;font-weight:700;margin:0 0 20px">Library check-in</p>
          <img src="${src}" width="300" height="300" alt="QR" style="display:block;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px"/>
          <p style="font-size:12px;color:#64748b;margin-top:20px">${format(new Date(), 'd MMM yyyy')}</p>
        </body></html>`;
      await Print.printAsync({ html });
    } catch {
      Alert.alert('Print failed', 'Could not open the printer.');
    } finally {
      setPrinting(false);
    }
  }, [dailyQrToken]);

  const handleRotateQr = useCallback(async () => {
    const qrInfo = await generateDailyQr({ rotate: true });
    if (qrInfo?.locked) {
      Alert.alert('Monthly limit', qrInfo.message || 'QR code can be changed only once in a month.');
      return;
    }
  }, [generateDailyQr]);

  const onDateChange = useCallback(
    (event: { type?: string }, date?: Date) => {
      if (Platform.OS === 'android') setShowDatePicker(false);
      if (event.type === 'dismissed') return;
      if (date) {
        const key = format(date, 'yyyy-MM-dd');
        setSelectedDate(key);
        fetchAttendanceByDate(key);
      }
    },
    [fetchAttendanceByDate]
  );

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      if (prev >= enrichedRows.length) return prev;
      return Math.min(prev + PAGE_SIZE, enrichedRows.length);
    });
  }, [enrichedRows.length]);

  const keyExtractor = useCallback((item: AttendanceEntryRowData) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceEntryRowData }) => (
      <AttendanceEntryRow item={item} styles={rowStyles} />
    ),
    [rowStyles]
  );

  const listHeader = useMemo(
    () => (
      <AttendanceListHeader
        styles={styles as Record<string, object>}
        attendancesCount={attendances.length}
        studentsCount={studentCount}
        attendanceRatio={attendanceRatio}
        dailyQrToken={dailyQrToken}
        printing={printing}
        selectedDateObj={selectedDateObj}
        isToday={isToday}
        showDatePicker={showDatePicker}
        onRotateQr={handleRotateQr}
        onPrint={handlePrint}
        onOpenDatePicker={() => setShowDatePicker(true)}
        onCloseDatePicker={() => setShowDatePicker(false)}
        onDateChange={onDateChange}
      />
    ),
    [
      styles,
      attendances.length,
      studentCount,
      attendanceRatio,
      dailyQrToken,
      printing,
      selectedDateObj,
      isToday,
      showDatePicker,
      handleRotateQr,
      handlePrint,
      onDateChange,
    ]
  );

  const listEmpty = useMemo(() => <EmptyCheckIns styles={styles} />, [styles]);

  const listFooter = useMemo(
    () => (
      <View style={styles.blockedSection}>
        <View style={styles.checkHeaderLeft}>
          <Ionicons name="shield-outline" size={18} color={theme.colors.danger} />
          <Text style={styles.listTitle}>Blocked scan attempts</Text>
        </View>
        <Text style={styles.blockedHint}>
          Expired or unpaid students who tried to mark attendance
        </Text>
        {blockedLoading ? (
          <Text style={styles.blockedEmpty}>Loading…</Text>
        ) : blockedAttempts.length === 0 ? (
          <Text style={styles.blockedEmpty}>No blocked attempts recently.</Text>
        ) : (
          blockedAttempts.map((row) => (
            <View key={row.id} style={styles.blockedRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.blockedName} numberOfLines={1}>
                  {row.studentName}
                </Text>
                <Text style={styles.blockedMeta}>
                  Expiry:{' '}
                  {row.membershipExpiryDate
                    ? format(new Date(row.membershipExpiryDate), 'dd MMM yyyy')
                    : '—'}
                </Text>
              </View>
              <Text style={styles.blockedTime}>
                {row.attemptedAt ? format(new Date(row.attemptedAt), 'dd MMM · HH:mm') : '—'}
              </Text>
            </View>
          ))
        )}
      </View>
    ),
    [blockedAttempts, blockedLoading, styles]
  );

  const hasMore = visibleCount < enrichedRows.length;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.listContainer}>
        <FlashList
          data={visibleRows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: scrollBottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.35}
          drawDistance={280}
          removeClippedSubviews
          extraData={rowStyles}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContainer: {
      flex: 1,
    },
    statsStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 8,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#312E81',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    statChip: { flex: 1, alignItems: 'center' },
    statChipWide: { flex: 1.1, alignItems: 'center' },
    statChipVal: { fontSize: 24, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
    statChipValSmall: { fontSize: 22, fontWeight: '800', color: theme.colors.primary, letterSpacing: -0.5 },
    statChipLab: { marginTop: 2, fontSize: 11, fontWeight: '700', color: theme.colors.mutedText, textTransform: 'uppercase', letterSpacing: 0.4 },
    statChipDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
    qrPanel: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#312E81',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    qrInner: {
      width: 196,
      height: 196,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionRow: {
      flexDirection: 'row',
      marginTop: 22,
      width: '100%',
      gap: 12,
    },
    btnOutline: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    btnOutlineTxt: { fontSize: 15, fontWeight: '800', color: theme.colors.primary },
    qrRefTxt: {
      marginTop: 10,
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.mutedText,
      textAlign: 'center',
    },
    btnSolid: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 4,
    },
    btnSolidDim: { opacity: 0.5 },
    btnSolidTxt: { fontSize: 15, fontWeight: '800', color: theme.colors.dark },
    dateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    dateIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: mode === 'dark' ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateTextWrap: { flex: 1 },
    dateLabel: { fontSize: 12, fontWeight: '800', color: theme.colors.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 },
    dateHuman: { marginTop: 4, fontSize: 16, fontWeight: '800', color: theme.colors.text },
    dateDoneIos: { alignItems: 'flex-end', paddingVertical: 6, paddingHorizontal: 4 },
    dateDoneTxt: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
    checkHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    checkHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    listTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
    checkCount: {
      backgroundColor: mode === 'dark' ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.10)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    checkCountTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    entryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
      ...Platform.select({
        ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
        android: { elevation: 2 },
      }),
    },
    entryAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    entryAvatarImg: { width: 40, height: 40, borderRadius: 20 },
    entryAvatarTxt: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
    entryUsername: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    entryTime: { fontSize: 13, fontWeight: '700', color: theme.colors.mutedText },
    presentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(34,197,94,0.16)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    presentTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.success },
    emptyCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 40,
      paddingHorizontal: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { marginTop: 14, fontSize: 17, fontWeight: '800', color: theme.colors.text },
    emptySub: { marginTop: 6, fontSize: 14, color: theme.colors.mutedText, textAlign: 'center' },
    blockedSection: {
      marginTop: 20,
      marginBottom: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
    },
    blockedHint: { marginTop: 6, marginBottom: 12, fontSize: 12, fontWeight: '600', color: theme.colors.mutedText },
    blockedEmpty: { fontSize: 13, fontWeight: '700', color: theme.colors.mutedText, paddingVertical: 8 },
    blockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    blockedName: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
    blockedMeta: { marginTop: 2, fontSize: 12, fontWeight: '600', color: theme.colors.mutedText },
    blockedTime: { fontSize: 11, fontWeight: '700', color: theme.colors.mutedText, textAlign: 'right' },
  });
}
