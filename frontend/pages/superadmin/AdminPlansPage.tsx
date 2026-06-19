import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiDelete, apiGet, apiPost, apiPut, type ApiError } from '../../services/api';
import { useAppStore } from '../../store';
import { theme } from '../../theme';
import LoginScreen from '../../screens/auth/LoginScreen';
import ForbiddenScreen from '../../screens/common/ForbiddenScreen';
import { SaasEmptyState } from '../../components/superadmin/ui';
import { DashboardWidgetSkeleton } from '../../components/superadmin/dashboard';
import { useTheme } from '../../theme/ThemeProvider';

type PlanRow = {
  _id: string;
  name: string;
  key: 'trial' | 'monthly' | '6month' | 'yearly' | string;
  price: number;
  discount: number;
  finalPrice: number;
  originalPrice?: number | null;
  strikePrice?: number | null;
  savings?: number;
  duration: number;
  isActive: boolean;
  tag?: string | null;
  isPublic?: boolean;
  isOneTimeOffer?: boolean;
  isTrial?: boolean;
  allowedLibraryIds?: string[];
  planType?: string;
  planTypeLabel?: string;
  librariesLabel?: string;
  description?: string;
  campaignName?: string | null;
  promoStartDate?: string | null;
  promoEndDate?: string | null;
  badges?: { recommended?: boolean; bestValue?: boolean; limitedTime?: boolean; exclusive?: boolean };
  analytics?: { views: number; purchases: number; conversionRate: number; revenue: number };
};

type LibraryOption = { id: string; name: string };

function calcFinal(price: number, discountPct: number) {
  const p = Number(price || 0);
  const d = Math.min(100, Math.max(0, Number(discountPct || 0)));
  const final = Math.round((p - p * (d / 100)) * 100) / 100;
  return Math.max(0, final);
}

function slugifyPlanKey(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 40);
}

export default function AdminPlansPage() {
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 768;
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(mode, isCompact), [mode, isCompact]);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated());
  const role = useAppStore((s) => s.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PlanRow[]>([]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlanRow | null>(null);

  const [fName, setFName] = useState('');
  const [fKey, setFKey] = useState('');
  const [fPrice, setFPrice] = useState('0');
  const [fDiscount, setFDiscount] = useState('0');
  const [fDuration, setFDuration] = useState('0');
  const [fTag, setFTag] = useState('');
  const [fActive, setFActive] = useState(true);
  const [fOriginalPrice, setFOriginalPrice] = useState('');
  const [fIsPublic, setFIsPublic] = useState(true);
  const [fIsOneTimeOffer, setFIsOneTimeOffer] = useState(false);
  const [fAllowedLibraryIds, setFAllowedLibraryIds] = useState<string[]>([]);
  const [libraries, setLibraries] = useState<LibraryOption[]>([]);
  const [libSearch, setLibSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(windowWidth < 768 ? 'cards' : 'table');
  const effectiveViewMode = isCompact ? 'cards' : viewMode;
  const [analyticsOpen, setAnalyticsOpen] = useState<PlanRow | null>(null);
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; planName?: string; libraryName?: string; timestamp?: string }[]>([]);
  const [fDescription, setFDescription] = useState('');
  const [fCampaignName, setFCampaignName] = useState('');
  const [fPromoStart, setFPromoStart] = useState('');
  const [fPromoEnd, setFPromoEnd] = useState('');
  const [fBadgeRecommended, setFBadgeRecommended] = useState(false);
  const [fBadgeBestValue, setFBadgeBestValue] = useState(false);
  const [fBadgeLimitedTime, setFBadgeLimitedTime] = useState(false);
  const [fBadgeExclusive, setFBadgeExclusive] = useState(false);

  const finalPreview = useMemo(() => calcFinal(Number(fPrice), Number(fDiscount)), [fPrice, fDiscount]);

  const resetForm = useCallback(() => {
    setEditing(null);
    setFName('');
    setFKey('');
    setFPrice('0');
    setFDiscount('0');
    setFDuration('0');
    setFTag('');
    setFActive(true);
    setFOriginalPrice('');
    setFIsPublic(true);
    setFIsOneTimeOffer(false);
    setFAllowedLibraryIds([]);
    setLibSearch('');
    setFDescription('');
    setFCampaignName('');
    setFPromoStart('');
    setFPromoEnd('');
    setFBadgeRecommended(false);
    setFBadgeBestValue(false);
    setFBadgeLimitedTime(false);
    setFBadgeExclusive(false);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((p: PlanRow) => {
    setEditing(p);
    setFName(p.name || '');
    setFKey(String(p.key || ''));
    setFPrice(String(p.price ?? 0));
    setFDiscount(String(p.discount ?? 0));
    setFDuration(String(p.duration ?? 0));
    setFTag(String(p.tag || ''));
    setFActive(Boolean(p.isActive));
    setFOriginalPrice(p.originalPrice != null ? String(p.originalPrice) : '');
    setFIsPublic(p.isPublic !== false);
    setFIsOneTimeOffer(Boolean(p.isOneTimeOffer));
    setFAllowedLibraryIds(Array.isArray(p.allowedLibraryIds) ? p.allowedLibraryIds.map(String) : []);
    setFDescription(String(p.description || ''));
    setFCampaignName(String(p.campaignName || ''));
    setFPromoStart(p.promoStartDate ? String(p.promoStartDate).slice(0, 10) : '');
    setFPromoEnd(p.promoEndDate ? String(p.promoEndDate).slice(0, 10) : '');
    setFBadgeRecommended(Boolean(p.badges?.recommended));
    setFBadgeBestValue(Boolean(p.badges?.bestValue));
    setFBadgeLimitedTime(Boolean(p.badges?.limitedTime));
    setFBadgeExclusive(Boolean(p.badges?.exclusive));
    setOpen(true);
  }, []);

  const loadLibraries = useCallback(async () => {
    try {
      const res = await apiGet<{ ok: boolean; libraries: { id: string; name: string }[] }>(
        `/api/admin/libraries`,
        { limit: 200 }
      );
      setLibraries((res.libraries || []).map((l) => ({ id: String(l.id), name: String(l.name) })));
    } catch {
      setLibraries([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ ok: boolean; plans: PlanRow[] }>(`/api/plans`, { all: 1, enriched: 1 });
      setRows(Array.isArray(res?.plans) ? res.plans : []);
    } catch (e: any) {
      const err = e as ApiError;
      setError(err?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await apiGet<{ ok: boolean; logs: typeof auditLogs }>(`/api/superadmin/plan-audit-logs`, { limit: 20 });
      setAuditLogs(res.logs || []);
    } catch {
      setAuditLogs([]);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (role !== 'admin') return;
    load();
    void loadLibraries();
    void loadAuditLogs();
  }, [isAuthenticated, role, load, loadLibraries, loadAuditLogs]);

  const save = useCallback(async () => {
    const name = fName.trim();
    const key = slugifyPlanKey(fKey.trim() || name);
    const priceRaw = fPrice.trim();
    const discountRaw = fDiscount.trim();
    const durationRaw = fDuration.trim();
    const price = Number(priceRaw);
    const discount = Number(discountRaw);
    const duration = Number(durationRaw);
    const tag = fTag.trim() ? fTag.trim() : null;
    const originalPriceRaw = fOriginalPrice.trim();
    const originalPrice = originalPriceRaw ? Number(originalPriceRaw) : null;

    if (!name) return Alert.alert('Missing', 'Plan name is required');
    if (!key) {
      return Alert.alert('Invalid key', 'Use letters, numbers, hyphens only (e.g. 6-month, premium-yearly)');
    }
    if (!priceRaw || Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
      return Alert.alert('Invalid', 'Enter valid offer price');
    }
    if (originalPriceRaw && (Number.isNaN(originalPrice) || !Number.isFinite(originalPrice!) || originalPrice! < 0)) {
      return Alert.alert('Invalid', 'Enter valid original price');
    }
    if (!fIsPublic && fAllowedLibraryIds.length === 0) {
      return Alert.alert('Missing', 'Select at least one library for a library-specific plan');
    }
    if (!discountRaw || Number.isNaN(discount) || !Number.isFinite(discount) || discount < 0 || discount > 100) {
      return Alert.alert('Invalid', 'Enter valid discount (0–100)');
    }
    if (!durationRaw || Number.isNaN(duration) || !Number.isFinite(duration) || duration < 0) {
      return Alert.alert('Invalid', 'Enter valid duration in days');
    }

    const payload = {
      name,
      key,
      price,
      discount,
      duration,
      isActive: fActive,
      tag,
      originalPrice,
      isPublic: fIsPublic,
      isOneTimeOffer: fIsOneTimeOffer,
      allowedLibraryIds: fIsPublic ? [] : fAllowedLibraryIds,
      description: fDescription.trim(),
      campaignName: fCampaignName.trim() || null,
      promoStartDate: fPromoStart.trim() || null,
      promoEndDate: fPromoEnd.trim() || null,
      badges: {
        recommended: fBadgeRecommended,
        bestValue: fBadgeBestValue,
        limitedTime: fBadgeLimitedTime,
        exclusive: fBadgeExclusive,
      },
    };

    setSaving(true);
    try {
      if (editing?._id) {
        await apiPut(`/api/plans/${editing._id}`, payload);
      } else {
        await apiPost(`/api/plans`, payload);
      }
      setOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      const err = e as ApiError;
      Alert.alert('Save failed', err?.message || 'Could not save plan');
    } finally {
      setSaving(false);
    }
  }, [editing, fActive, fAllowedLibraryIds, fBadgeBestValue, fBadgeExclusive, fBadgeLimitedTime, fBadgeRecommended, fCampaignName, fDescription, fDiscount, fDuration, fIsOneTimeOffer, fIsPublic, fKey, fName, fOriginalPrice, fPrice, fPromoEnd, fPromoStart, fTag, load, resetForm]);

  const clonePlan = useCallback(
    (p: PlanRow) => {
      Alert.alert('Clone plan?', `Create a copy of ${p.name}`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clone',
          onPress: async () => {
            try {
              await apiPost(`/api/plans/${p._id}/clone`, {});
              await load();
            } catch (e: any) {
              Alert.alert('Clone failed', (e as ApiError)?.message || 'Could not clone plan');
            }
          },
        },
      ]);
    },
    [load]
  );

  const setDurationPreset = useCallback((days: number) => {
    setFDuration(String(days));
  }, []);

  const toggleActive = useCallback(
    async (p: PlanRow) => {
      try {
        await apiPut(`/api/plans/${p._id}`, { isActive: !p.isActive });
        setRows((prev) => prev.map((x) => (x._id === p._id ? { ...x, isActive: !p.isActive } : x)));
      } catch (e: any) {
        const err = e as ApiError;
        Alert.alert('Update failed', err?.message || 'Could not update plan');
      }
    },
    [setRows]
  );

  const remove = useCallback((p: PlanRow) => {
    const key = String(p?.key || '').toLowerCase();
    if (key === 'trial') {
      Alert.alert('Protected plan', 'The Trial plan cannot be deleted.');
      return;
    }
    if (deletingId) return;
    Alert.alert('Delete plan?', `${p.name} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(p._id);
            await apiDelete(`/api/plans/${p._id}`);
            setRows((prev) => prev.filter((x) => x._id !== p._id));
          } catch (e: any) {
            const err = e as ApiError;
            Alert.alert('Delete failed', err?.message || 'Could not delete plan');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }, [deletingId]);

  if (!isAuthenticated) return <LoginScreen />;
  if (role && role !== 'admin') return <ForbiddenScreen message="This page is only for admin accounts." />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>Plan Management</Text>
          <Text style={styles.subTitle}>Enterprise plans · offers · analytics</Text>
        </View>
        {!isCompact ? (
          <TouchableOpacity onPress={() => setViewMode((m) => (m === 'table' ? 'cards' : 'table'))} style={styles.viewToggle} activeOpacity={0.9}>
            <Ionicons name={viewMode === 'table' ? 'grid-outline' : 'list-outline'} size={16} color={theme.colors.text} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={openCreate} style={styles.addBtn} activeOpacity={0.9}>
          <Ionicons name="add" size={18} color={theme.colors.surface} />
          {!isCompact ? <Text style={styles.addTxt}>Add</Text> : null}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
        {loading ? (
          <View style={{ gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.card, { opacity: 0.7 }]}>
                <DashboardWidgetSkeleton lines={3} />
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Could not load</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn} activeOpacity={0.9}>
              <Text style={styles.retryTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : rows.length === 0 ? (
          <SaasEmptyState
            icon="layers-outline"
            title="No Plans Created Yet"
            description="Create your first subscription plan with pricing, duration, and visibility rules."
            actionLabel="Create Plan"
            onAction={openCreate}
          />
        ) : effectiveViewMode === 'table' ? (
          <View style={styles.tableWrap}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 1.4 }]}>Plan</Text>
              <Text style={[styles.th, { width: 72 }]}>Type</Text>
              <Text style={[styles.th, { width: 72 }]}>Price</Text>
              <Text style={[styles.th, { width: 72 }]}>Libs</Text>
              <Text style={[styles.th, { width: 64 }]}>Status</Text>
            </View>
            {rows.map((p) => {
              const calculatedFinal = calcFinal(Number(p.price || 0), Number(p.discount || 0));
              return (
                <View key={p._id} style={styles.tableRow}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.tdTitle}>{p.name}</Text>
                    <Text style={styles.tdSub}>{p.key}</Text>
                  </View>
                  <Text style={[styles.td, { width: 72 }]}>{p.planTypeLabel || 'Public'}</Text>
                  <Text style={[styles.td, { width: 72 }]}>₹{calculatedFinal}</Text>
                  <Text style={[styles.td, { width: 72 }]}>{p.librariesLabel || 'All'}</Text>
                  <View style={{ width: 64 }}>
                    <Text style={[styles.td, { color: p.isActive ? theme.colors.success : theme.colors.danger }]}>
                      {p.isActive ? 'On' : 'Off'}
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity onPress={() => setAnalyticsOpen(p)} style={styles.miniBtn}>
                      <Ionicons name="analytics-outline" size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEdit(p)} style={styles.miniBtn}>
                      <Ionicons name="create-outline" size={14} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => clonePlan(p)} style={styles.miniBtn}>
                      <Ionicons name="copy-outline" size={14} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleActive(p)} style={styles.miniBtn}>
                      <Ionicons name={p.isActive ? 'eye-off-outline' : 'eye-outline'} size={14} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {auditLogs.length > 0 ? (
              <View style={{ marginTop: 18 }}>
                <Text style={styles.auditTitle}>Recent Plan Audit</Text>
                {auditLogs.slice(0, 6).map((log) => (
                  <Text key={log.id} style={styles.auditRow}>
                    {log.action.replace(/_/g, ' ')} · {log.planName || '—'} · {log.libraryName || '—'}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {rows.map((p) => {
              const key = String(p.key || '').toLowerCase();
              const isSystemPlan = key === 'trial';
              const calculatedFinal = calcFinal(Number(p.price || 0), Number(p.discount || 0));
              const strike = p.strikePrice ?? (p.originalPrice != null && p.originalPrice > calculatedFinal ? p.originalPrice : null);
              const hasDiscount = strike != null && strike > calculatedFinal;
              const savings = p.savings ?? (hasDiscount ? Math.round((Number(strike) - calculatedFinal) * 100) / 100 : 0);
              return (
                <View key={p._id} style={styles.card}>
                  <View style={[styles.cardTop, isCompact && styles.cardTopStack]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={styles.cardTitle}>{p.name}</Text>
                        <Text style={styles.keyPill}>{String(p.key).toUpperCase()}</Text>
                        {p.tag ? <Text style={styles.tagPill}>{String(p.tag)}</Text> : null}
                        {!p.isActive ? <Text style={styles.offlinePill}>Disabled</Text> : null}
                        {p.isOneTimeOffer ? <Text style={styles.offerPill}>One-Time</Text> : null}
                        {p.isPublic === false ? <Text style={styles.privatePill}>Library Only</Text> : null}
                        <View style={[styles.statusBadge, p.isActive ? styles.statusOn : styles.statusOff]}>
                          <Text style={[styles.statusBadgeTxt, p.isActive ? styles.statusOnTxt : styles.statusOffTxt]}>
                            {p.isActive ? '🟢 Active' : '⚫ Disabled'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.metaTxt}>
                        Duration: <Text style={styles.metaStrong}>{Number(p.duration || 0)} days</Text>
                        {p.isPublic === false && p.allowedLibraryIds?.length
                          ? ` · ${p.allowedLibraryIds.length} libraries`
                          : ''}
                      </Text>
                    </View>

                    <View style={[styles.cardPriceCol, isCompact && { alignItems: 'flex-start', marginTop: 8 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        {hasDiscount ? <Text style={styles.strike}>₹{strike}</Text> : null}
                        <Text style={styles.price}>₹{calculatedFinal}</Text>
                      </View>
                      {hasDiscount ? (
                        <Text style={styles.discountTxt}>
                          {Number(p.discount || 0) > 0 ? `${Math.round(Number(p.discount || 0))}% OFF` : 'Special Offer'}
                          {savings > 0 ? ` · Save ₹${savings}` : ''}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity onPress={() => setAnalyticsOpen(p)} style={styles.actionBtn} activeOpacity={0.9}>
                      <Ionicons name="analytics-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.actionTxt}>Analytics</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => clonePlan(p)} style={styles.actionBtn} activeOpacity={0.9}>
                      <Ionicons name="copy-outline" size={16} color={theme.colors.text} />
                      <Text style={styles.actionTxt}>Clone</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleActive(p)} style={styles.actionBtn} activeOpacity={0.9}>
                      <Ionicons name={p.isActive ? 'eye-off-outline' : 'eye-outline'} size={16} color={theme.colors.text} />
                      <Text style={styles.actionTxt}>{p.isActive ? 'Disable' : 'Enable'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEdit(p)} style={styles.actionBtn} activeOpacity={0.9}>
                      <Ionicons name="create-outline" size={16} color={theme.colors.text} />
                      <Text style={styles.actionTxt}>Edit</Text>
                    </TouchableOpacity>
                    {!isSystemPlan ? (
                      <TouchableOpacity
                        onPress={() => remove(p)}
                        style={[styles.actionBtn, { borderColor: theme.colors.danger }, deletingId === p._id && { opacity: 0.6 }]}
                        activeOpacity={0.9}
                        disabled={deletingId === p._id}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                        <Text style={[styles.actionTxt, { color: theme.colors.danger }]}>
                          {deletingId === p._id ? 'Deleting…' : 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.actionBtn, { opacity: 0.7 }]}>
                        <Ionicons name="lock-closed-outline" size={16} color={theme.colors.mutedText} />
                        <Text style={[styles.actionTxt, { color: theme.colors.mutedText }]}>Protected</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (saving) return;
          setOpen(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Plan' : 'Add Plan'}</Text>
            <Text style={styles.modalSub}>Final price auto-calculates from discount.</Text>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ gap: 10, paddingTop: 12, paddingBottom: 4 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Field
                label="Plan Name"
                value={fName}
                onChangeText={(text) => {
                  setFName(text);
                  if (!editing) setFKey(slugifyPlanKey(text));
                }}
                placeholder="Premium Yearly"
              />
              <Field
                label="Plan Key"
                value={fKey}
                onChangeText={(text) => setFKey(slugifyPlanKey(text))}
                placeholder="premium-yearly"
                autoCapitalize="none"
              />
              <Text style={styles.keyHint}>Auto-generated from name · only a-z, 0-9, hyphens</Text>
              <Field label="Description" value={fDescription} onChangeText={setFDescription} placeholder="Short plan description" />
              <Text style={{ color: theme.colors.mutedText, fontWeight: '800', fontSize: 12 }}>Duration</Text>
              <View style={styles.presetRow}>
                {[
                  { label: '7D', days: 7 },
                  { label: '30D', days: 30 },
                  { label: '90D', days: 90 },
                  { label: '180D', days: 180 },
                  { label: '1Y', days: 365 },
                ].map((opt) => (
                  <TouchableOpacity key={opt.days} style={styles.presetChip} onPress={() => setDurationPreset(opt.days)}>
                    <Text style={styles.presetChipTxt}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field label="Duration (days)" value={fDuration} onChangeText={setFDuration} keyboardType="numeric" />
              <Field label="Offer Price (₹)" value={fPrice} onChangeText={setFPrice} keyboardType="numeric" />
              <Field label="Original Price (₹)" value={fOriginalPrice} onChangeText={setFOriginalPrice} keyboardType="numeric" placeholder="4999" />
              <Field label="Discount (%)" value={fDiscount} onChangeText={setFDiscount} keyboardType="numeric" />
              <Field label="Campaign Name (promo)" value={fCampaignName} onChangeText={setFCampaignName} placeholder="Summer Offer" />
              <Field label="Promo Start (YYYY-MM-DD)" value={fPromoStart} onChangeText={setFPromoStart} placeholder="2026-06-01" />
              <Field label="Promo End (YYYY-MM-DD)" value={fPromoEnd} onChangeText={setFPromoEnd} placeholder="2026-08-31" />

              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Final Price</Text>
                <Text style={styles.previewValue}>₹{finalPreview}</Text>
              </View>
              {fOriginalPrice.trim() && Number(fOriginalPrice) > finalPreview ? (
                <Text style={styles.savingsHint}>
                  Savings: ₹{Math.round((Number(fOriginalPrice) - finalPreview) * 100) / 100}
                </Text>
              ) : null}

              <TouchableOpacity onPress={() => setFIsPublic((x) => !x)} style={styles.toggleRow} activeOpacity={0.9}>
                <Ionicons name={fIsPublic ? 'checkbox-outline' : 'square-outline'} size={20} color={theme.colors.text} />
                <Text style={styles.toggleTxt}>Public Plan (all libraries)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFIsOneTimeOffer((x) => !x)} style={styles.toggleRow} activeOpacity={0.9}>
                <Ionicons name={fIsOneTimeOffer ? 'checkbox-outline' : 'square-outline'} size={20} color={theme.colors.text} />
                <Text style={styles.toggleTxt}>One-Time Offer (hide after purchase)</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.colors.mutedText, fontWeight: '800', fontSize: 12, marginTop: 8 }}>Conversion Badges</Text>
              <TouchableOpacity onPress={() => setFBadgeRecommended((x) => !x)} style={styles.toggleRow} activeOpacity={0.9}>
                <Ionicons name={fBadgeRecommended ? 'checkbox-outline' : 'square-outline'} size={20} color={theme.colors.text} />
                <Text style={styles.toggleTxt}>⭐ Most Popular</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFBadgeBestValue((x) => !x)} style={styles.toggleRow} activeOpacity={0.9}>
                <Ionicons name={fBadgeBestValue ? 'checkbox-outline' : 'square-outline'} size={20} color={theme.colors.text} />
                <Text style={styles.toggleTxt}>🔥 Best Value</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFBadgeLimitedTime((x) => !x)} style={styles.toggleRow} activeOpacity={0.9}>
                <Ionicons name={fBadgeLimitedTime ? 'checkbox-outline' : 'square-outline'} size={20} color={theme.colors.text} />
                <Text style={styles.toggleTxt}>⏰ Limited Time</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFBadgeExclusive((x) => !x)} style={styles.toggleRow} activeOpacity={0.9}>
                <Ionicons name={fBadgeExclusive ? 'checkbox-outline' : 'square-outline'} size={20} color={theme.colors.text} />
                <Text style={styles.toggleTxt}>🎁 Exclusive Offer</Text>
              </TouchableOpacity>
              <Field label="Tag (optional)" value={fTag} onChangeText={setFTag} placeholder="Popular / Best Value" />
              <TouchableOpacity onPress={() => setFActive((x) => !x)} style={styles.toggleRow} activeOpacity={0.9}>
                <Ionicons name={fActive ? 'checkbox-outline' : 'square-outline'} size={20} color={theme.colors.text} />
                <Text style={styles.toggleTxt}>Active</Text>
              </TouchableOpacity>

              {!fIsPublic ? (
                <View style={styles.libPickBox}>
                  <Text style={styles.libPickTitle}>Select Libraries</Text>
                  <TextInput
                    value={libSearch}
                    onChangeText={setLibSearch}
                    placeholder="Search library…"
                    placeholderTextColor={theme.colors.mutedText}
                    style={styles.libSearch}
                  />
                  <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                    {libraries
                      .filter((l) => !libSearch.trim() || l.name.toLowerCase().includes(libSearch.trim().toLowerCase()))
                      .map((l) => {
                        const on = fAllowedLibraryIds.includes(l.id);
                        return (
                          <TouchableOpacity
                            key={l.id}
                            style={styles.libRow}
                            onPress={() =>
                              setFAllowedLibraryIds((prev) =>
                                on ? prev.filter((id) => id !== l.id) : [...prev, l.id]
                              )
                            }
                          >
                            <Ionicons
                              name={on ? 'checkbox-outline' : 'square-outline'}
                              size={18}
                              color={on ? theme.colors.primary : theme.colors.mutedText}
                            />
                            <Text style={styles.libRowTxt}>{l.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.cancelBtn} activeOpacity={0.9} disabled={saving}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} style={[styles.saveBtn, saving && { opacity: 0.7 }]} activeOpacity={0.9} disabled={saving}>
                <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(analyticsOpen)} transparent animationType="fade" onRequestClose={() => setAnalyticsOpen(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{analyticsOpen?.name} Analytics</Text>
            <Text style={styles.modalSub}>Views, purchases, conversion & revenue</Text>
            <View style={{ gap: 8, marginTop: 14 }}>
              <Text style={styles.analyticsRow}>Views: {analyticsOpen?.analytics?.views ?? 0}</Text>
              <Text style={styles.analyticsRow}>Purchases: {analyticsOpen?.analytics?.purchases ?? 0}</Text>
              <Text style={styles.analyticsRow}>Conversion: {analyticsOpen?.analytics?.conversionRate ?? 0}%</Text>
              <Text style={styles.analyticsRow}>Revenue: ₹{analyticsOpen?.analytics?.revenue ?? 0}</Text>
            </View>
            <TouchableOpacity onPress={() => setAnalyticsOpen(null)} style={[styles.saveBtn, { marginTop: 16 }]}>
              <Text style={styles.saveTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'number-pad' | 'decimal-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

function Field({ label, ...rest }: FieldProps) {
  return (
    <View>
      <Text style={{ color: theme.colors.mutedText, fontWeight: '900', fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor={theme.colors.mutedText}
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: theme.colors.text,
          fontWeight: '800',
        }}
      />
    </View>
  );
}

function withAlpha(hex: string, alpha: number) {
  const h = String(hex || '').replace('#', '').trim();
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function makeStyles(_mode: 'light' | 'dark', isCompact: boolean) {
  return StyleSheet.create({
  topBar: {
    paddingHorizontal: isCompact ? 12 : 14,
    paddingTop: isCompact ? 36 : 40,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: isCompact ? 8 : 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: theme.colors.text, fontWeight: '900', fontSize: isCompact ? 15 : 16 },
  subTitle: { color: theme.colors.mutedText, fontWeight: '800', fontSize: 11, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: isCompact ? 10 : 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  addTxt: { color: theme.colors.surface, fontWeight: '900' },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  tableWrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },
  tableHead: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  th: { fontSize: 11, fontWeight: '900', color: theme.colors.mutedText, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: 4,
  },
  tdTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.text },
  tdSub: { fontSize: 11, fontWeight: '700', color: theme.colors.mutedText, marginTop: 2 },
  td: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  rowActions: { flexDirection: 'row', gap: 4, marginLeft: 'auto' as const },
  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  auditTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.text, marginBottom: 8 },
  auditRow: { fontSize: 12, fontWeight: '700', color: theme.colors.mutedText, marginBottom: 4 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  presetChipTxt: { fontSize: 11, fontWeight: '900', color: theme.colors.text },
  keyHint: { fontSize: 11, fontWeight: '700', color: theme.colors.mutedText, marginTop: -4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusOn: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.22)' },
  statusOff: { backgroundColor: 'rgba(148,163,184,0.1)', borderColor: 'rgba(148,163,184,0.22)' },
  statusBadgeTxt: { fontSize: 10, fontWeight: '900' },
  statusOnTxt: { color: '#059669' },
  statusOffTxt: { color: theme.colors.mutedText },
  analyticsRow: { fontSize: 14, fontWeight: '800', color: theme.colors.text },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: isCompact ? 12 : 14,
    ...theme.shadow.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTopStack: { flexDirection: 'column' },
  cardPriceCol: { alignItems: 'flex-end' },
  cardTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  keyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: withAlpha(theme.colors.primary, 0.12),
    color: theme.colors.primary,
    fontWeight: '900',
    fontSize: 11,
    borderWidth: 1,
    borderColor: withAlpha(theme.colors.primary, 0.20),
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(250,204,21,0.14)',
    color: '#B45309',
    fontWeight: '900',
    fontSize: 11,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.22)',
  },
  offlinePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: withAlpha(theme.colors.danger, 0.10),
    color: theme.colors.danger,
    fontWeight: '900',
    fontSize: 11,
    borderWidth: 1,
    borderColor: withAlpha(theme.colors.danger, 0.18),
  },
  offerPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.12)',
    color: '#2563EB',
    fontWeight: '900',
    fontSize: 11,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  privatePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.12)',
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 11,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  metaTxt: { marginTop: 6, color: theme.colors.mutedText, fontWeight: '800', fontSize: 12 },
  metaStrong: { color: theme.colors.text, fontWeight: '900' },
  price: { color: theme.colors.text, fontWeight: '900', fontSize: 18 },
  strike: { color: theme.colors.mutedText, fontWeight: '900', textDecorationLine: 'line-through' },
  discountTxt: { marginTop: 4, color: theme.colors.success, fontWeight: '900', fontSize: 12 },

  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: isCompact ? undefined : 1,
    minWidth: isCompact ? '47%' : undefined,
    flexGrow: isCompact ? 1 : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  actionTxt: { color: theme.colors.text, fontWeight: '900', fontSize: 12 },

  errorBox: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 14 },
  errorTitle: { color: theme.colors.danger, fontWeight: '900', fontSize: 14 },
  errorMsg: { marginTop: 6, color: theme.colors.mutedText, fontWeight: '800' },
  retryBtn: { marginTop: 10, backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  retryTxt: { color: theme.colors.surface, fontWeight: '900' },

  backdrop: {
    flex: 1,
    backgroundColor: withAlpha(theme.colors.dark, 0.55),
    alignItems: 'center',
    justifyContent: isCompact ? 'flex-end' : 'center',
    padding: isCompact ? 0 : 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: isCompact ? '92%' : '90%',
    backgroundColor: theme.colors.background,
    borderRadius: isCompact ? 18 : 18,
    borderTopLeftRadius: isCompact ? 20 : 18,
    borderTopRightRadius: isCompact ? 20 : 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalScroll: { maxHeight: isCompact ? 420 : 480 },
  modalTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 16 },
  modalSub: { marginTop: 6, color: theme.colors.mutedText, fontWeight: '800', fontSize: 12 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  previewLabel: { color: theme.colors.mutedText, fontWeight: '900' },
  previewValue: { color: theme.colors.text, fontWeight: '900' },
  savingsHint: { color: theme.colors.success, fontWeight: '800', fontSize: 12 },
  libPickBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  libPickTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 13, marginBottom: 8 },
  libSearch: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    marginBottom: 8,
    fontWeight: '700',
  },
  libRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  libRowTxt: { color: theme.colors.text, fontWeight: '700', fontSize: 13, flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  toggleTxt: { color: theme.colors.text, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { color: theme.colors.text, fontWeight: '900' },
  saveBtn: { flex: 1, borderRadius: 12, backgroundColor: theme.colors.primary, paddingVertical: 12, alignItems: 'center' },
  saveTxt: { color: theme.colors.surface, fontWeight: '900' },
  });
}

