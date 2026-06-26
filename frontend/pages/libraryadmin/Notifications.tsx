import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore, type Notification } from '../../store';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollBottomForTabBar } from '../../hooks/useScrollBottomForTabBar';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { isLibraryIncomingNotification, isLibraryIncomingUnread } from '../../utils/notificationRead';

export default function AdminNotifications() {
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(mode), [mode]);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotificationsPage = useAppStore((s) => s.fetchNotificationsPage);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const scrollBottom = useScrollBottomForTabBar();

  const [page, setPage] = useState(1);
  const limit = 20;
  const [pageItems, setPageItems] = useState<Notification[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [hasNext, setHasNext] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    setPageLoading(true);
    try {
      const list = await fetchNotificationsPage(p, limit);
      setPageItems(list);
      setHasNext(list.length === limit);
      setPage(p);
    } finally {
      setPageLoading(false);
    }
  }, [fetchNotificationsPage]);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPage(page);
    } finally {
      setRefreshing(false);
    }
  }, [loadPage, page]);

  const sorted = useMemo(
    () => [...pageItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [pageItems]
  );

  const unreadIncomingCount = useMemo(
    () => sorted.filter((n) => isLibraryIncomingUnread(n)).length,
    [sorted]
  );

  const handleItemPress = useCallback(
    (item: Notification) => {
      if (isLibraryIncomingUnread(item)) {
        void markNotificationRead(item.id);
        setPageItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readByMe: true } : n))
        );
      }
    },
    [markNotificationRead]
  );

  const handleMarkAllIncomingRead = useCallback(async () => {
    const unread = sorted.filter((n) => isLibraryIncomingUnread(n));
    if (unread.length === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      setPageItems((prev) =>
        prev.map((n) => (isLibraryIncomingUnread(n) ? { ...n, readByMe: true } : n))
      );
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
    } finally {
      setMarkingAll(false);
    }
  }, [sorted, markingAll, markNotificationRead]);

  const renderHistoryItem = useCallback(
    ({ item }: { item: Notification }) => {
      const incoming = isLibraryIncomingNotification(item);
      const isNew = isLibraryIncomingUnread(item);

      return (
        <Pressable
          onPress={() => handleItemPress(item)}
          style={({ pressed }) => [
            styles.historyCard,
            isNew && styles.historyCardNew,
            pressed && { opacity: 0.92 },
          ]}
        >
          {isNew ? <View style={styles.newStripe} /> : null}

          <View style={styles.cardRow}>
            <View style={[styles.cardIconWrap, isNew && styles.cardIconWrapNew]}>
              <Ionicons
                name={incoming ? 'mail-unread-outline' : 'notifications-outline'}
                size={16}
                color={isNew ? theme.colors.danger : theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.cardTitle, isNew && styles.cardTitleNew]} numberOfLines={1}>
                  {item.title}
                </Text>
                {isNew ? (
                  <View style={styles.newPill}>
                    <Text style={styles.newPillTxt}>NEW</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.cardDate, isNew && styles.cardDateNew]}>
                {format(new Date(item.date), 'MMM d, yyyy · h:mm a')}
              </Text>
            </View>
            {incoming ? (
              <View style={[styles.inboxBadge, isNew && styles.inboxBadgeNew]}>
                <Ionicons
                  name="business-outline"
                  size={11}
                  color={isNew ? theme.colors.danger : theme.colors.mutedText}
                />
                <Text style={[styles.inboxBadgeTxt, isNew && styles.inboxBadgeTxtNew]}>Admin</Text>
              </View>
            ) : (
              <View style={styles.allBadge}>
                <Ionicons name="people-outline" size={11} color={theme.colors.primary} />
                <Text style={styles.allBadgeTxt}>Sent</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardMsg, isNew && styles.cardMsgNew]}>{item.message}</Text>
        </Pressable>
      );
    },
    [styles, handleItemPress]
  );

  const ListHeader = (
    <View>
      <View style={styles.pageHeader}>
        <View style={styles.headerIcon}>
          <Ionicons name="mail-open-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Inbox</Text>
          <Text style={styles.pageSub}>Platform alerts and sent message history</Text>
        </View>
        {unreadIncomingCount > 0 ? (
          <View style={styles.headerUnreadBadge}>
            <Text style={styles.headerUnreadBadgeTxt}>
              {unreadIncomingCount > 99 ? '99+' : unreadIncomingCount}
            </Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.commCenterBtn}
        onPress={() => navigation.navigate('CommunicationCenter')}
        activeOpacity={0.88}
      >
        <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.primary} />
        <Text style={styles.commCenterBtnTxt}>Send messages in Communication Center</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
      </TouchableOpacity>

      {sorted.length > 0 ? (
        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.historyTitle}>History</Text>
            <Text style={styles.historyCount}>
              {sorted.length} items · red only for new admin messages
            </Text>
          </View>
          {unreadIncomingCount > 0 ? (
            <TouchableOpacity
              onPress={() => void handleMarkAllIncomingRead()}
              disabled={markingAll}
              style={styles.markAllBtn}
              activeOpacity={0.88}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={theme.colors.danger} />
              ) : (
                <Text style={styles.markAllBtnTxt}>Mark all read</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: scrollBottom + 20 }]}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.pager}>
            <Pressable
              onPress={() => loadPage(Math.max(1, page - 1))}
              disabled={page === 1 || pageLoading}
              style={({ pressed }) => [
                styles.pagerBtn,
                (page === 1 || pageLoading) && styles.pagerBtnDisabled,
                pressed && !(page === 1 || pageLoading) && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="chevron-back" size={18} color={page === 1 ? theme.colors.mutedText : theme.colors.text} />
              <Text style={[styles.pagerTxt, page === 1 && { color: theme.colors.mutedText }]}>Prev</Text>
            </Pressable>

            <Text style={styles.pagerMid}>{pageLoading ? 'Loading…' : `Page ${page}`}</Text>

            <Pressable
              onPress={() => loadPage(page + 1)}
              disabled={!hasNext || pageLoading}
              style={({ pressed }) => [
                styles.pagerBtn,
                (!hasNext || pageLoading) && styles.pagerBtnDisabled,
                pressed && !(!hasNext || pageLoading) && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.pagerTxt, !hasNext && { color: theme.colors.mutedText }]}>Next</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={!hasNext ? theme.colors.mutedText : theme.colors.text}
              />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={44} color={theme.colors.mutedText} />
            <Text style={styles.emptyTxt}>No notifications sent yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  const unreadBg = mode === 'dark' ? 'rgba(239,68,68,0.12)' : '#FEF2F2';
  const unreadBorder = mode === 'dark' ? 'rgba(239,68,68,0.4)' : '#FECACA';

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    listContent: { paddingHorizontal: 16, paddingTop: 12 },

    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 40,
      marginBottom: 18,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerUnreadBadge: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: 8,
      borderRadius: 13,
      backgroundColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerUnreadBadgeTxt: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
    pageSub: { fontSize: 13, fontWeight: '500', color: theme.colors.mutedText, marginTop: 2 },
    commCenterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    commCenterBtnTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },

    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: 18,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16 },
        android: { elevation: 2 },
      }),
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.mutedText,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.background,
    },
    inputWrapFocus: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surface,
    },
    textAreaWrap: {
      alignItems: 'flex-start',
      minHeight: 110,
      paddingVertical: 12,
    },
    textInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
      fontWeight: '500',
    },
    textArea: {
      minHeight: 90,
      lineHeight: 22,
    },
    sendBtn: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: theme.colors.primary,
      paddingVertical: 15,
      borderRadius: 14,
    },
    sendBtnTxt: { fontSize: 16, fontWeight: '800', color: theme.colors.dark },

    historyHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },
    historyTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    historyCount: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginTop: 2 },
    markAllBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: unreadBg,
      borderWidth: 1,
      borderColor: unreadBorder,
    },
    markAllBtnTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.danger },

    historyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    historyCardNew: {
      backgroundColor: unreadBg,
      borderColor: unreadBorder,
    },
    newStripe: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: theme.colors.danger,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    cardIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardIconWrapNew: {
      backgroundColor: unreadBg,
      borderColor: unreadBorder,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, flex: 1 },
    cardTitleNew: { fontWeight: '800', color: theme.colors.text },
    newPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.danger,
    },
    newPillTxt: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
    cardDate: { fontSize: 11, fontWeight: '500', color: theme.colors.mutedText, marginTop: 2 },
    cardDateNew: { color: theme.colors.danger, fontWeight: '700' },
    inboxBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inboxBadgeNew: {
      backgroundColor: unreadBg,
      borderColor: unreadBorder,
    },
    inboxBadgeTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.mutedText },
    inboxBadgeTxtNew: { color: theme.colors.danger },
    allBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    allBadgeTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
    cardMsg: { fontSize: 13, color: theme.colors.mutedText, lineHeight: 20 },
    cardMsgNew: { color: theme.colors.text, fontWeight: '500' },

    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyTxt: { marginTop: 10, fontSize: 15, fontWeight: '600', color: theme.colors.mutedText },

    pager: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    pagerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pagerBtnDisabled: { opacity: 0.6 },
    pagerTxt: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
    pagerMid: { fontSize: 12, fontWeight: '800', color: theme.colors.mutedText },
  });
}
