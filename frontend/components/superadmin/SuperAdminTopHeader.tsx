import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_HEADER_BG, APP_HEADER_FG } from '../../constants/appHeader';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { SuperAdminHeaderLogo } from './SuperAdminHeaderLogo';

type Props = {
  navigation: NavigationProp<ParamListBase>;
  options: { title?: string | ((props: unknown) => string) };
  showDrawerToggle?: boolean;
};

export function SuperAdminTopHeader({ navigation, options, showDrawerToggle = true }: Props) {
  const insets = useSafeAreaInsets();
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
          backgroundColor: APP_HEADER_BG,
          borderBottomColor: 'rgba(6,95,70,0.12)',
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {showDrawerToggle ? <DrawerToggleButton tintColor={APP_HEADER_FG} /> : <View style={{ width: 8 }} />}
        </View>
        <Text style={[styles.title, { color: APP_HEADER_FG }]} numberOfLines={1}>
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
