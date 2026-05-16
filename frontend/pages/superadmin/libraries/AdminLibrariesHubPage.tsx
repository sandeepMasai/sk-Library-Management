import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X } from 'lucide-react-native';
import { PlanFilterGrid } from '../../../components/superadmin/filters/PlanFilterGrid';
import type { PlanTypeFilter } from '../../../components/superadmin/filters';
import { theme } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';
import LoginScreen from '../../../screens/auth/LoginScreen';
import ForbiddenScreen from '../../../screens/common/ForbiddenScreen';
import { useAppStore } from '../../../store';
import type { LibrariesStackParamList } from './types';

type Nav = NativeStackNavigationProp<LibrariesStackParamList, 'LibrariesHub'>;

/**
 * Plan picker hub — glass cards only. Tap a card to open the filtered libraries list.
 */
export default function AdminLibrariesHubPage() {
  const navigation = useNavigation<Nav>();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode), [mode]);
  const [search, setSearch] = useState('');

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);

  const openList = (planType: PlanTypeFilter) => {
    navigation.navigate('LibrariesFiltered', {
      planType,
      search: search.trim() || undefined,
    });
  };

  if (!isAuthenticated()) return <LoginScreen />;
  if (role && role !== 'admin') return <ForbiddenScreen message="This page is only for admin accounts." />;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>ADMIN</Text>
      <Text style={styles.title}>Libraries</Text>
      <Text style={styles.sub}>Tap a plan to view libraries</Text>

      <View style={styles.searchBox}>
        <Search size={20} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search library / owner / email"
          placeholderTextColor="#64748B"
          style={styles.searchInput}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => openList('all')}
        />
        {search.trim() ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      <PlanFilterGrid
        selectedPlan="all"
        onSelectPlan={openList}
        mode="navigate"
        showAllButton
        maxWidth={440}
      />
    </ScrollView>
  );
}

function makeStyles(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#EEF2F7' },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
      flexGrow: 0,
    },
    kicker: {
      fontSize: 11,
      fontWeight: '900',
      color: isDark ? '#64748B' : theme.colors.mutedText,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: isDark ? '#F8FAFC' : theme.colors.text,
      marginTop: 6,
      letterSpacing: -0.8,
    },
    sub: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : theme.colors.mutedText,
      marginTop: 6,
      marginBottom: 16,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? '#151B24' : theme.colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.14)' : theme.colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      minHeight: 52,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#F1F5F9' : theme.colors.text,
      paddingVertical: 12,
    },
  });
}
