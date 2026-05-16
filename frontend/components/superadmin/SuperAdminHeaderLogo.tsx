import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { navigateToSuperAdminDashboard } from './navigateToSuperAdminDashboard';

const BRAND_LOGO = require('../../assets/logo.png');

type Props = {
  // Drawer, stack, or root — resolved via parent walk in navigateToSuperAdminDashboard
  navigation: { dispatch?: unknown; getParent?: () => unknown; getState?: () => unknown };
  size?: number;
};

/** Tap brand logo → Super Admin Operations Dashboard (any nested screen). */
export function SuperAdminHeaderLogo({ navigation, size = 36 }: Props) {
  const { mode } = useTheme();

  const goDashboard = useCallback(() => {
    navigateToSuperAdminDashboard(navigation as never);
  }, [navigation]);

  return (
    <Pressable
      onPress={goDashboard}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go to Operations Dashboard"
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}
    >
      <View
        style={[
          styles.shell,
          {
            width: size + 8,
            height: size + 8,
            borderColor: mode === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.08)',
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          },
        ]}
      >
        <Image source={BRAND_LOGO} style={{ width: size, height: size }} resizeMode="contain" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginRight: 12,
  },
  shell: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
