import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Vibration,
  useWindowDimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  LogOut,
  Settings2,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { theme } from '../../theme';
import { useAppStore } from '../../store';
import { SignOutConfirmModal } from '../SignOutConfirmModal';
import { resetAuthNavigation } from '../../navigation/rootNavigation';
import {
  SUPERADMIN_INSIGHT_ITEMS,
  SUPERADMIN_NAV_ITEMS,
  type SuperAdminInsightItem,
  type SuperAdminInsightKey,
  type SuperAdminNavItem,
  type SuperAdminNavKey,
} from './superAdminNavConfig';
import { SuperAdminNavIcon } from './SuperAdminNavIcons';
import { navigateToSuperAdminDashboard } from './navigateToSuperAdminDashboard';

const BRAND_LOGO = require('../../assets/logo.png');

export type SuperAdminDrawerContentProps = DrawerContentComponentProps & {
  railCollapsed: boolean;
  onToggleRail: () => void;
  notificationCount?: number;
  shouldCloseDrawer?: boolean;
};

type SidebarTokens = {
  bg: string;
  bgElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  hover: string;
  activeBg: string;
  activeBorder: string;
  chipBg: string;
  chipBorder: string;
  footerBg: string;
  shadow: string;
  isDark: boolean;
};

function tryHaptic() {
  if (Platform.OS === 'android') Vibration.vibrate(1);
}

function buildTokens(isDark: boolean): SidebarTokens {
  return {
    bg: isDark ? '#0C111D' : '#FFFFFF',
    bgElevated: isDark ? '#131A2B' : '#F8FAFC',
    border: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.07)',
    text: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#CBD5E1' : '#334155',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#4F46E5',
    accentSoft: isDark ? 'rgba(99,102,241,0.22)' : 'rgba(79,70,229,0.1)',
    accentMuted: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(79,70,229,0.06)',
    hover: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)',
    activeBg: isDark ? 'rgba(99,102,241,0.14)' : 'rgba(79,70,229,0.08)',
    activeBorder: isDark ? 'rgba(129,140,248,0.45)' : 'rgba(79,70,229,0.22)',
    chipBg: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)',
    chipBorder: isDark ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.18)',
    footerBg: isDark ? '#0F1524' : '#F8FAFC',
    shadow: isDark ? 'transparent' : 'rgba(15,23,42,0.08)',
    isDark,
  };
}

function SectionLabel({ label, collapsed, tokens }: { label: string; collapsed: boolean; tokens: SidebarTokens }) {
  if (collapsed) return <View style={{ height: 8 }} />;
  return (
    <View style={sectionStyles.wrap}>
      <Text style={[sectionStyles.txt, { color: tokens.textMuted }]}>{label}</Text>
      <View style={[sectionStyles.line, { backgroundColor: tokens.border }]} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  txt: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});

function NavRow(props: {
  label: string;
  collapsed: boolean;
  active?: boolean;
  onPress: () => void;
  tokens: SidebarTokens;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const { label, collapsed, active, onPress, tokens, icon, badge, variant = 'primary' } = props;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={(state) => {
        const hovered = Platform.OS === 'web' && 'hovered' in state && Boolean((state as { hovered?: boolean }).hovered);
        const pressed = state.pressed;
        return [
          navStyles.outer,
          collapsed && navStyles.outerCollapsed,
          active && {
            backgroundColor: tokens.activeBg,
            borderColor: tokens.activeBorder,
            borderWidth: 1,
          },
          !active && (pressed || hovered) && { backgroundColor: tokens.hover },
        ];
      }}
    >
      {active ? <View style={[navStyles.accentBar, { backgroundColor: tokens.accent }]} /> : null}
      <View style={[navStyles.inner, collapsed && navStyles.innerCollapsed]}>
        <View
          style={[
            navStyles.iconBox,
            variant === 'secondary' && navStyles.iconBoxSm,
            active && { backgroundColor: tokens.accent },
            !active && { backgroundColor: tokens.bgElevated, borderWidth: 1, borderColor: tokens.border },
          ]}
        >
          {icon}
        </View>
        {!collapsed ? (
          <>
            <Text
              style={[
                navStyles.label,
                { color: active ? tokens.text : tokens.textSecondary },
                active && navStyles.labelActive,
                variant === 'secondary' && navStyles.labelSecondary,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {badge}
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const navStyles = StyleSheet.create({
  outer: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  outerCollapsed: {
    marginHorizontal: 10,
    alignItems: 'center',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 12,
    minHeight: 48,
  },
  innerCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
    minHeight: 52,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBoxSm: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  label: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  labelActive: {
    fontWeight: '800',
  },
  labelSecondary: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export function SuperAdminDrawerContent(props: SuperAdminDrawerContentProps) {
  const { navigation, state, railCollapsed, onToggleRail, notificationCount = 0, shouldCloseDrawer = false } = props;
  const { mode } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const logout = useAppStore((s) => s.logout);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const collapsed = railCollapsed;
  const showRailToggle = Platform.OS === 'web' && windowWidth >= 1024;

  const activeRoute = state.routeNames[state.index] as SuperAdminNavKey;
  const tokens = useMemo(() => buildTokens(mode === 'dark'), [mode]);

  const onNavigate = useCallback(
    (key: SuperAdminNavKey) => {
      tryHaptic();
      navigation.navigate(key as never);
      if (shouldCloseDrawer) navigation.closeDrawer();
    },
    [navigation, shouldCloseDrawer]
  );

  const onInsight = useCallback(
    (section: SuperAdminInsightKey) => {
      tryHaptic();
      (navigation as any).navigate('Dashboard', { section });
      if (shouldCloseDrawer) navigation.closeDrawer();
    },
    [navigation, shouldCloseDrawer]
  );

  const openLogoutModal = useCallback(() => {
    tryHaptic();
    setShowLogoutModal(true);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    setShowLogoutModal(false);
    logout();
    resetAuthNavigation('Login');
    if (shouldCloseDrawer) navigation.closeDrawer();
  }, [logout, navigation, shouldCloseDrawer]);

  const renderInsightIcon = (item: SuperAdminInsightItem, color: string, size = 17) => {
    const p = { color, size, strokeWidth: 2.1 };
    if (item.icon === 'Building2') return <Building2 {...p} />;
    if (item.icon === 'IndianRupee') return <IndianRupee {...p} />;
    return <Activity {...p} />;
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: tokens.bg,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: tokens.border,
        },
        header: {
          paddingTop: Platform.OS === 'ios' ? 14 : 16,
          paddingHorizontal: collapsed ? 12 : 18,
          paddingBottom: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.border,
        },
        brandRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginTop: 20,
        },
        brandRowCollapsed: {
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          marginTop: 20,
        },
        logoWrap: {
          width: 48,
          height: 48,
          borderRadius: 14,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.bgElevated,
          borderWidth: 1,
          borderColor: tokens.border,
        },
        logoWrapCollapsed: {
          width: 44,
          height: 44,
        },
        logoImage: {
          width: 42,
          height: 42,
        },
        logoImageCollapsed: {
          width: 38,
          height: 38,
        },
        title: {
          fontSize: 17,
          fontWeight: '800',
          color: tokens.text,
          letterSpacing: -0.45,
        },
        subtitle: {
          marginTop: 2,
          fontSize: 12,
          fontWeight: '600',
          color: tokens.textMuted,
        },
        collapseBtn: {
          width: 34,
          height: 34,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: tokens.bgElevated,
          alignItems: 'center',
          justifyContent: 'center',
        },
        statusChip: {
          marginTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: collapsed ? 'center' : 'stretch',
          paddingVertical: 9,
          paddingHorizontal: collapsed ? 10 : 12,
          borderRadius: 12,
          backgroundColor: tokens.chipBg,
          borderWidth: 1,
          borderColor: tokens.chipBorder,
        },
        statusDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#22C55E',
        },
        statusTxt: {
          flex: 1,
          fontSize: 12,
          fontWeight: '700',
          color: tokens.textSecondary,
        },
        scroll: { flex: 1 },
        scrollContent: {
          paddingTop: 6,
          paddingBottom: 16,
        },
        footer: {
          paddingHorizontal: collapsed ? 10 : 14,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 22 : 16,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: tokens.border,
          backgroundColor: tokens.footerBg,
        },
        profileCard: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: collapsed ? 10 : 12,
          borderRadius: 16,
          backgroundColor: tokens.bg,
          borderWidth: 1,
          borderColor: tokens.border,
          ...Platform.select({
            web: { boxShadow: `0 4px 24px ${tokens.shadow}` } as object,
            default: theme.shadow.card,
          }),
        },
        profileCardCollapsed: {
          flexDirection: 'column',
          gap: 8,
        },
        avatarRing: {
          width: 44,
          height: 44,
          borderRadius: 14,
          padding: 2,
        },
        avatar: {
          flex: 1,
          borderRadius: 12,
          backgroundColor: tokens.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
        profileMeta: { flex: 1, minWidth: 0 },
        profileName: { fontSize: 14, fontWeight: '800', color: tokens.text, letterSpacing: -0.2 },
        profileRole: { marginTop: 2, fontSize: 11, fontWeight: '600', color: tokens.textMuted },
        actionRow: {
          flexDirection: 'row',
          gap: 8,
          marginTop: 10,
        },
        actionBtn: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: tokens.bgElevated,
        },
        actionBtnDanger: {
          borderColor: tokens.isDark ? 'rgba(248,113,113,0.35)' : 'rgba(239,68,68,0.25)',
          backgroundColor: tokens.isDark ? 'rgba(239,68,68,0.1)' : 'rgba(254,242,242,0.9)',
        },
        actionTxt: { fontSize: 12, fontWeight: '800', color: tokens.textSecondary },
        actionTxtDanger: { color: theme.colors.danger },
        iconOnlyBtn: {
          width: 40,
          height: 40,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: tokens.bgElevated,
          alignItems: 'center',
          justifyContent: 'center',
        },
        badge: {
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          paddingHorizontal: 6,
          alignItems: 'center',
          justifyContent: 'center',
        },
        badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
        dot: { width: 8, height: 8, borderRadius: 4 },
      }),
    [tokens, collapsed]
  );

  const renderNavBadge = (item: SuperAdminNavItem) => {
    const count = item.navKey === 'Notifications' ? notificationCount : 0;
    if (item.badge === 'count' && count > 0) {
      return (
        <View style={[styles.badge, { backgroundColor: tokens.accent }]}>
          <Text style={styles.badgeTxt}>{count > 99 ? '99+' : count}</Text>
        </View>
      );
    }
    if (item.badge === 'dot') {
      return <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />;
    }
    return null;
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, collapsed && { alignItems: 'center' }]}>
        <View style={[styles.brandRow, collapsed && styles.brandRowCollapsed]}>
          <Pressable
            onPress={() => navigateToSuperAdminDashboard(navigation)}
            style={[styles.logoWrap, collapsed && styles.logoWrapCollapsed]}
            accessibilityRole="button"
            accessibilityLabel="Go to Operations Dashboard"
          >
            <Image
              source={BRAND_LOGO}
              style={[styles.logoImage, collapsed && styles.logoImageCollapsed]}
              resizeMode="contain"
            />
          </Pressable>

          {!collapsed ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>
                SmartLibDesk
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Super Admin Console
              </Text>
            </View>
          ) : null}

          {showRailToggle ? (
            <Pressable
              onPress={onToggleRail}
              style={styles.collapseBtn}
              accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight size={18} color={tokens.textMuted} strokeWidth={2.2} />
              ) : (
                <ChevronLeft size={18} color={tokens.textMuted} strokeWidth={2.2} />
              )}
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statusChip}>
          <View style={styles.statusDot} />
          {!collapsed ? <Text style={styles.statusTxt}>Platform admin · online</Text> : null}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionLabel label="NAVIGATION" collapsed={collapsed} tokens={tokens} />

        {SUPERADMIN_NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.navKey;
          return (
            <Animated.View key={item.navKey} entering={FadeIn.duration(220)}>
              <NavRow
                label={item.label}
                collapsed={collapsed}
                active={isActive}
                onPress={() => onNavigate(item.navKey)}
                tokens={tokens}
                badge={!collapsed ? renderNavBadge(item) : null}
                icon={
                  <SuperAdminNavIcon
                    name={item.icon}
                    color={isActive ? '#FFFFFF' : tokens.textMuted}
                    size={18}
                    strokeWidth={isActive ? 2.3 : 2}
                  />
                }
              />
            </Animated.View>
          );
        })}

        <SectionLabel label="INSIGHTS" collapsed={collapsed} tokens={tokens} />

        {SUPERADMIN_INSIGHT_ITEMS.map((item) => (
          <NavRow
            key={item.insightKey}
            label={item.label}
            collapsed={collapsed}
            variant="secondary"
            onPress={() => onInsight(item.insightKey)}
            tokens={tokens}
            icon={renderInsightIcon(item, tokens.textMuted)}
          />
        ))}

        {showRailToggle && !collapsed ? (
          <Pressable onPress={onToggleRail} style={[styles.actionBtn, { marginHorizontal: 14, marginTop: 16 }]}>
            <Text style={styles.actionTxt}>Collapse sidebar</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={[styles.profileCard, collapsed && styles.profileCardCollapsed]}>
          <LinearGradient colors={['#818CF8', '#4F46E5']} style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>SA</Text>
            </View>
          </LinearGradient>

          {!collapsed ? (
            <View style={styles.profileMeta}>
              <Text style={styles.profileName} numberOfLines={1}>
                Super Admin
              </Text>
              <Text style={styles.profileRole} numberOfLines={1}>
                admin · platform
              </Text>
            </View>
          ) : null}

          {collapsed ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.iconOnlyBtn} onPress={() => navigation.navigate('Settings' as never)}>
                <Settings2 size={18} color={tokens.textMuted} strokeWidth={2} />
              </Pressable>
              <Pressable style={[styles.iconOnlyBtn, styles.actionBtnDanger]} onPress={openLogoutModal}>
                <LogOut size={18} color={theme.colors.danger} strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {!collapsed ? (
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('Settings' as never)}>
              <Settings2 size={16} color={tokens.textMuted} strokeWidth={2} />
              <Text style={styles.actionTxt}>Settings</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={openLogoutModal}>
              <LogOut size={16} color={theme.colors.danger} strokeWidth={2} />
              <Text style={[styles.actionTxt, styles.actionTxtDanger]}>Logout</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <SignOutConfirmModal
        visible={showLogoutModal}
        preset="superAdmin"
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </View>
  );
}
