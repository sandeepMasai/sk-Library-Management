import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { theme } from '../../theme';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { SuperAdminHeaderLogo } from './SuperAdminHeaderLogo';

type Props = {
  navigation: NavigationProp<ParamListBase>;
  options: { title?: string | ((props: unknown) => string) };
  showDrawerToggle?: boolean;
};

export function SuperAdminTopHeader({ navigation, options, showDrawerToggle = true }: Props) {
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
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
          borderBottomColor: mode === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)',
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {showDrawerToggle ? <DrawerToggleButton tintColor={theme.colors.text} /> : <View style={{ width: 8 }} />}
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <SuperAdminHeaderLogo navigation={navigation} size={34} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    letterSpacing: -0.3,
    paddingHorizontal: 8,
  },
});
