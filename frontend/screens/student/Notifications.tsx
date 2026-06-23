import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAppStore } from '../../store';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { registerStudentPushTokenIfNeeded } from '../../services/pushNotifications';
import { useScrollBottomForTabBar } from '../../hooks/useScrollBottomForTabBar';
import { resolveNotificationCategory } from '../../constants/notificationCategoryUi';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { isNotificationUnread } from '../../utils/notificationRead';
import {
  StudentNotificationRow,
  type StudentNotificationRowData,
  type StudentNotificationRowStyles,
} from '../../components/student/StudentNotificationRow';
import { NotificationImageViewer } from '../../components/student/NotificationImageViewer';
import { NotificationPdfViewer } from '../../components/student/NotificationPdfViewer';
import {
  resolveNotificationDisplayMessage,
  resolveNotificationDocumentUrl,
  notificationHasPdf,
} from '../../utils/notificationDocument';

type RowItem = StudentNotificationRowData;

type FilterKey = 'all' | 'unread';

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  try {
    if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
    if (isYesterday(d)) return `Yesterday · ${format(d, 'h:mm a')}`;
    return format(d, 'dd MMM · h:mm a');
  } catch {
    return '';
  }
}

const ListSeparator = () => <View style={separatorStyles.sep} />;
const separatorStyles = StyleSheet.create({ sep: { height: 10 } });

export default function StudentNotifications() {
  const navigation = useNavigation();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const rowStyles = useMemo<StudentNotificationRowStyles>(
    () => ({
      card: styles.card,
      cardUnread: styles.cardUnread,
      unreadStripe: styles.unreadStripe,
      cardInner: styles.cardInner,
      iconBox: styles.iconBox,
      body: styles.body,
      bodyTop: styles.bodyTop,
      bodyTopLeft: styles.bodyTopLeft,
      catTag: styles.catTag,
      catTagTxt: styles.catTagTxt,
      unreadPill: styles.unreadPill,
      unreadPillTxt: styles.unreadPillTxt,
      redDot: styles.redDot,
      time: styles.time,
      timeUnread: styles.timeUnread,
      title: styles.title,
      titleUnread: styles.titleUnread,
      message: styles.message,
      messageUnread: styles.messageUnread,
      readMore: styles.readMore,
    }),
    [styles]
  );

  const currentUser = useAppStore((s) => s.currentUser);
  const notifications = useAppStore((s) => s.notifications);
  const lastNotifSeenAt = useAppStore((s) => s.lastNotifSeenAt);
  const fetchNotifications = useAppStore((s) => s.fetchNotifications);
  const getStudentNotifs = useAppStore((s) => s.getStudentNotifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const scrollBottom = useScrollBottomForTabBar();

  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null);

  const allRows: RowItem[] = useMemo(() => {
    if (!currentUser) return [];
    return [...getStudentNotifs(currentUser.id)]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((n): RowItem => {
        const isSystem = n.id.startsWith('sys-');
        const isUnread = isNotificationUnread(n, currentUser.id, lastNotifSeenAt);
        return {
          id: n.id,
          title: n.title,
          message: resolveNotificationDisplayMessage(n),
          imageUrl: n.imageUrl || null,
          documentUrl: resolveNotificationDocumentUrl(n),
          hasPdf: notificationHasPdf(n),
          timeLabel: timeLabel(n.date),
          isSystem,
          category: resolveNotificationCategory(n.category, isSystem),
          isUnread,
        };
      });
  }, [currentUser, getStudentNotifs, notifications, lastNotifSeenAt]);

  const unreadCount = useMemo(() => allRows.filter((r) => r.isUnread).length, [allRows]);

  const rows = useMemo(
    () => (filter === 'unread' ? allRows.filter((r) => r.isUnread) : allRows),
    [allRows, filter]
  );

  const handleNotificationPress = useCallback(
    (id: string, isUnread: boolean) => {
      if (isUnread && !id.startsWith('sys-')) {
        markNotificationRead(id);
      }
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [markNotificationRead]
  );

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setRefreshing(true);
    try {
      await fetchNotifications(currentUser.id);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser, fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    if (!currentUser || unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(currentUser.id);
    } finally {
      setMarkingAll(false);
    }
  }, [currentUser, unreadCount, markingAll, markAllNotificationsRead]);

  useFocusEffect(
    useCallback(() => {
      void registerStudentPushTokenIfNeeded();
      if (currentUser) void fetchNotifications(currentUser.id);
    }, [currentUser, fetchNotifications])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => void handleMarkAllRead()}
            disabled={markingAll}
            style={headerBtnStyles.wrap}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={theme.colors.danger} />
            ) : (
              <Text style={headerBtnStyles.txt}>Mark all read</Text>
            )}
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, unreadCount, markingAll, handleMarkAllRead]);

  const keyExtractor = useCallback((item: RowItem) => item.id, []);

  const handleImagePress = useCallback((imageUrl: string, title: string) => {
    setViewer({ url: imageUrl, title });
  }, []);

  const handlePdfPress = useCallback(async (documentUrl: string, title: string) => {
    try {
      const canOpen = await Linking.canOpenURL(documentUrl);
      if (canOpen) {
        await Linking.openURL(documentUrl);
        return;
      }
    } catch {
      // Fall through to in-app viewer.
    }
    setPdfViewer({ url: documentUrl, title });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: RowItem }) => (
      <StudentNotificationRow
        item={item}
        isOpen={expanded.has(item.id)}
        styles={rowStyles}
        onPress={handleNotificationPress}
        onImagePress={handleImagePress}
        onPdfPress={handlePdfPress}
      />
    ),
    [expanded, rowStyles, handleNotificationPress, handleImagePress, handlePdfPress]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <View style={styles.summaryIcon}>
              <Ionicons name="notifications" size={22} color={theme.colors.danger} />
            </View>
            <View>
              <Text style={styles.summaryTitle}>Inbox</Text>
              <Text style={styles.summarySub}>
                {unreadCount > 0
                  ? `${unreadCount} new · tap to mark read`
                  : 'All caught up — no new messages'}
              </Text>
            </View>
          </View>
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeTxt}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : (
            <View style={styles.caughtUpBadge}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
            </View>
          )}
        </View>

        <View style={styles.filterRow}>
          {(['all', 'unread'] as const).map((key) => {
            const active = filter === key;
            const label = key === 'all' ? `All (${allRows.length})` : `Unread (${unreadCount})`;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[styles.filterChip, active && styles.filterChipOn]}
                activeOpacity={0.88}
              >
                <Text style={[styles.filterChipTxt, active && styles.filterChipTxtOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBanner}
            onPress={() => void handleMarkAllRead()}
            disabled={markingAll}
            activeOpacity={0.9}
          >
            <Ionicons name="checkmark-done" size={18} color={theme.colors.danger} />
            <Text style={styles.markAllBannerTxt}>
              {markingAll ? 'Marking all as read…' : 'Mark all as read'}
            </Text>
            {markingAll ? (
              <ActivityIndicator size="small" color={theme.colors.danger} style={styles.markAllSpinner} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={theme.colors.danger} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [
      styles,
      unreadCount,
      allRows.length,
      filter,
      markingAll,
      handleMarkAllRead,
    ]
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.empty}>
        <View style={styles.emptyIconRing}>
          <Ionicons
            name={filter === 'unread' ? 'mail-open-outline' : 'notifications-off-outline'}
            size={36}
            color={theme.colors.mutedText}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
        </Text>
        <Text style={styles.emptySub}>
          {filter === 'unread'
            ? 'You have read everything. Switch to All to see older messages.'
            : 'Library announcements and reminders will appear here.'}
        </Text>
      </View>
    ),
    [styles, filter]
  );

  if (!currentUser) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.listWrap}>
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={`${expanded.size}-${unreadCount}-${viewer?.url || ''}-${pdfViewer?.url || ''}`}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: scrollBottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.danger} />
          }
          drawDistance={240}
        />
      </View>
      <NotificationImageViewer
        imageUrl={viewer?.url ?? null}
        title={viewer?.title}
        onClose={() => setViewer(null)}
      />
      <NotificationPdfViewer
        pdfUrl={pdfViewer?.url ?? null}
        title={pdfViewer?.title}
        onClose={() => setPdfViewer(null)}
      />
    </SafeAreaView>
  );
}

const headerBtnStyles = StyleSheet.create({
  wrap: { marginRight: 12, paddingVertical: 6, paddingHorizontal: 4, minWidth: 88, alignItems: 'flex-end' },
  txt: { fontSize: 14, fontWeight: '800', color: theme.colors.danger },
});

function makeStyles(mode: 'light' | 'dark') {
  const unreadBg = mode === 'dark' ? 'rgba(239,68,68,0.14)' : '#FEF2F2';
  const unreadBorder = mode === 'dark' ? 'rgba(239,68,68,0.45)' : '#FECACA';

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    listWrap: { flex: 1 },

    headerBlock: { paddingTop: 8, paddingBottom: 4 },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
      ...Platform.select({
        ios: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
        android: { elevation: 2 },
      }),
    },
    summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: unreadBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
    summarySub: { marginTop: 2, fontSize: 13, fontWeight: '600', color: theme.colors.mutedText },
    unreadBadge: {
      minWidth: 28,
      height: 28,
      paddingHorizontal: 8,
      borderRadius: 14,
      backgroundColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadBadgeTxt: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
    caughtUpBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: mode === 'dark' ? 'rgba(34,197,94,0.16)' : '#ECFDF5',
      alignItems: 'center',
      justifyContent: 'center',
    },

    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    filterChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipOn: {
      backgroundColor: unreadBg,
      borderColor: theme.colors.danger,
    },
    filterChipTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.mutedText },
    filterChipTxtOn: { color: theme.colors.danger, fontWeight: '800' },

    markAllBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: unreadBg,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: unreadBorder,
      marginBottom: 12,
    },
    markAllBannerTxt: { flex: 1, fontSize: 14, fontWeight: '800', color: theme.colors.danger },
    markAllSpinner: { marginLeft: 4 },

    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 },
        android: { elevation: 1 },
      }),
    },
    cardUnread: {
      backgroundColor: unreadBg,
      borderColor: unreadBorder,
      ...Platform.select({
        ios: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10 },
        android: { elevation: 3 },
      }),
    },
    unreadStripe: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: theme.colors.danger,
    },
    cardInner: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },

    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    body: { flex: 1, minWidth: 0 },
    bodyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    bodyTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
    catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    catTagTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
    unreadPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.danger,
    },
    unreadPillTxt: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.6 },
    redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.danger },
    time: { fontSize: 11, fontWeight: '600', color: theme.colors.mutedText },
    timeUnread: { color: theme.colors.danger, fontWeight: '700' },
    title: { fontSize: 15, fontWeight: '600', color: theme.colors.mutedText, marginBottom: 4, lineHeight: 21 },
    titleUnread: { fontWeight: '800', color: theme.colors.text },
    message: { fontSize: 13, color: theme.colors.mutedText, lineHeight: 19 },
    messageUnread: { color: theme.colors.text, fontWeight: '500' },
    readMore: { fontSize: 12, fontWeight: '700', marginTop: 6 },

    empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 28, paddingBottom: 32 },
    emptyIconRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 6 },
    emptySub: { fontSize: 13, color: theme.colors.mutedText, textAlign: 'center', lineHeight: 20 },
  });
}
