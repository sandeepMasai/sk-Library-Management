import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { SuperAdminHeaderLogo } from './SuperAdminHeaderLogo';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  navigation: NavigationProp<ParamListBase>;
  options: { title?: string | ((props: unknown) => string) };
  showDrawerToggle?: boolean;
  notificationCount?: number;
  onNotificationsPress?: () => void;
};

export function SuperAdminTopHeader({
  navigation,
  options,
  showDrawerToggle = true,
  notificationCount = 0,
  onNotificationsPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const title =
    typeof options.title === 'string'
      ? options.title
      : typeof options.title === 'function'
        ? ''
        : '';

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 8 : 0),
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {showDrawerToggle ? (
            <DrawerToggleButton tintColor={theme.colors.text} />
          ) : (
            <View style={{ width: 8 }} />
          )}
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>
          <TouchableOpacity
            onPress={onNotificationsPress || (() => navigation.navigate('Notifications' as never))}
            style={[styles.bellBtn, { borderColor: theme.colors.border, backgroundColor: isDark ? 'rgba(148,163,184,0.08)' : theme.colors.background }]}
            activeOpacity={0.85}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
            {notificationCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <SuperAdminHeaderLogo navigation={navigation} size={32} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: '0 1px 0 rgba(15,23,42,0.06)' } as object,
      default: {},
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 4,
  },
  left: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    paddingHorizontal: 4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },
});
