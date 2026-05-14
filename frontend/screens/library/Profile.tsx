import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  Animated,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { api, apiGet, apiPost, apiPut, type ApiError } from '../../services/api';
import { useAppStore } from '../../store';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Library ProfileScreen
 *
 * - Header (back + title)
 * - Profile card (avatar/logo + owner name + email + badge)
 * - Basic info (name, email, phone)
 * - Business details (library name, address, city + change logo)
 *
 * Notes:
 * - Uses backend:
 *   - GET  /api/library/profile
 *   - PUT  /api/library/profile
 *   - POST /api/library/profile/send-mobile-verify-otp
 *   - POST /api/library/profile/verify-mobile-otp
 *   - POST /api/library/logo (multipart)
 */
export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const currentUser = useAppStore((s) => s.currentUser);
  const seats = useAppStore((s) => s.seats);
  const fetchSeats = useAppStore((s) => s.fetchSeats);
  const setTotalSeats = useAppStore((s) => s.setTotalSeats);
  const { mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(), [mode]);
  // Store update can be added later (not required for UI flow).

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [editSeatsOpen, setEditSeatsOpen] = useState(false);
  const [totalSeatsDraft, setTotalSeatsDraft] = useState('');
  const [seatsSaving, setSeatsSaving] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [verifyMobileOpen, setVerifyMobileOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpFocusIndex, setOtpFocusIndex] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendTimerKey, setResendTimerKey] = useState(0);
  const [verifySuccessModalOpen, setVerifySuccessModalOpen] = useState(false);
  const otpInputRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);
  const cursorBlink = useRef(new Animated.Value(1)).current;
  const [verifySendLoading, setVerifySendLoading] = useState(false);
  const [verifySubmitLoading, setVerifySubmitLoading] = useState(false);
  const resendRestartNextSend = useRef(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    channelLink: '',
    libraryName: '',
    address: '',
    city: '',
    mapUrl: '',
    whatsappGroup: '',
    whatsappChannel: '',
    telegram: '',
    logoUrl: null as string | null,
  });

  const initial = useMemo(() => (form.name || currentUser?.ownerName || currentUser?.name || 'U').trim().slice(0, 1).toUpperCase(), [form.name, currentUser]);

  const currentSeatTotal = useMemo(() => {
    if (!seats?.length) return 0;
    return Math.max(...seats.map((s) => s.number));
  }, [seats]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ ok: boolean; profile: any }>(`/api/library/profile`);
      const p = res.profile;
      setIsMobileVerified(Boolean(p?.isMobileVerified));
      setForm({
        name: p?.name || currentUser?.ownerName || currentUser?.name || '',
        email: p?.email || currentUser?.email || '',
        phone: p?.phone || currentUser?.phone || '',
        whatsappNumber: p?.communication?.whatsapp || p?.whatsappNumber || '',
        channelLink: p?.communication?.channel || p?.communityLinks?.whatsappChannel || '',
        libraryName: p?.libraryName || currentUser?.name || '',
        address: p?.address || currentUser?.address || '',
        city: p?.city || currentUser?.city || '',
        mapUrl: p?.mapUrl || '',
        whatsappGroup: p?.communityLinks?.whatsappGroup || '',
        whatsappChannel: p?.communityLinks?.whatsappChannel || '',
        telegram: p?.communityLinks?.telegram || '',
        logoUrl: p?.logoUrl || currentUser?.logoUrl || null,
      });
    } catch (e: any) {
      const err = e as ApiError;
      setError(err?.message || 'Failed to load profile');
      // Fallback to existing user data if available
      setForm((prev) => ({
        ...prev,
        name: currentUser?.ownerName || currentUser?.name || prev.name,
        email: currentUser?.email || prev.email,
        phone: currentUser?.phone || prev.phone,
        whatsappNumber: prev.whatsappNumber,
        channelLink: prev.channelLink,
        whatsappGroup: prev.whatsappGroup,
        whatsappChannel: prev.whatsappChannel,
        telegram: prev.telegram,
        libraryName: currentUser?.name || prev.libraryName,
        address: currentUser?.address || prev.address,
        city: currentUser?.city || prev.city,
        logoUrl: currentUser?.logoUrl || prev.logoUrl,
      }));
    } finally {
      try {
        await fetchSeats();
      } catch {
        // Seats may be blocked until subscription is active; ignore.
      }
      setLoading(false);
    }
  };

  const openEditSeats = () => {
    setTotalSeatsDraft(String(currentSeatTotal > 0 ? currentSeatTotal : 50));
    setEditSeatsOpen(true);
  };

  const saveSeatTotal = async () => {
    const n = Number(String(totalSeatsDraft).trim());
    if (!Number.isInteger(n) || n < 1 || n > 5000) {
      Alert.alert('Invalid', 'Total seats must be a whole number between 1 and 5000.');
      return;
    }
    setSeatsSaving(true);
    try {
      const res = await setTotalSeats(n);
      if (!res.ok) {
        Alert.alert('Could not update', res.message || 'Failed to update seats.');
        return;
      }
      setEditSeatsOpen(false);
      Alert.alert('Updated', `Library now has ${n} seats (numbered 1–${n}).`);
    } finally {
      setSeatsSaving(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!verifyMobileOpen) return undefined;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorBlink, { toValue: 0.25, duration: 450, useNativeDriver: true }),
        Animated.timing(cursorBlink, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => {
      anim.stop();
      cursorBlink.setValue(1);
    };
  }, [verifyMobileOpen, cursorBlink]);

  useEffect(() => {
    if (!verifyMobileOpen) return undefined;
    setResendSeconds(60);
    setCanResend(false);
    let sec = 60;
    const id = setInterval(() => {
      sec -= 1;
      if (sec <= 0) {
        setResendSeconds(0);
        setCanResend(true);
        clearInterval(id);
        return;
      }
      setResendSeconds(sec);
    }, 1000);
    return () => clearInterval(id);
  }, [verifyMobileOpen, resendTimerKey]);

  useEffect(() => {
    if (!verifyMobileOpen) return undefined;
    const t = setTimeout(() => {
      otpInputRefs.current[0]?.focus();
      setOtpFocusIndex(0);
    }, 180);
    return () => clearTimeout(t);
  }, [verifyMobileOpen]);

  useEffect(() => {
    if (!verifySuccessModalOpen) return undefined;
    const id = setTimeout(() => setVerifySuccessModalOpen(false), 2500);
    return () => clearTimeout(id);
  }, [verifySuccessModalOpen]);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setLogoPreview(result.assets[0].uri);
    }
  };

  const uploadLogo = async () => {
    if (!logoPreview) return;
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = logoPreview.split('/').pop() ?? 'logo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('logo', { uri: logoPreview, name: filename, type } as unknown as Blob);

      const response = await api.post<{ ok: boolean; profile: any }>(`/api/library/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const p = response.data?.profile;
      setForm((s) => ({ ...s, logoUrl: p?.logoUrl || s.logoUrl }));
      setLogoPreview(null);
      Alert.alert('Updated', 'Logo updated.');
    } catch (e: any) {
      const err = e as ApiError;
      Alert.alert('Error', err?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.libraryName.trim() || !form.city.trim()) {
      Alert.alert('Required', 'Name, Library name and City are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiPut<{ ok: boolean; profile: any }>(`/api/library/profile`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        communication: {
          whatsapp: form.whatsappNumber.trim(),
          channel: form.channelLink.trim(),
          email: form.email.trim(),
        },
        libraryName: form.libraryName.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        mapUrl: form.mapUrl.trim(),
        communityLinks: {
          whatsappGroup: form.whatsappGroup.trim(),
          whatsappChannel: form.whatsappChannel.trim(),
          telegram: form.telegram.trim(),
        },
      });
      Alert.alert('Saved', 'Profile updated.');
      // keep local form fresh
      const p = res.profile;
      setIsMobileVerified(Boolean(p?.isMobileVerified));
      setForm((s) => ({
        ...s,
        name: p?.name ?? s.name,
        email: p?.email ?? s.email,
        phone: p?.phone ?? s.phone,
        whatsappNumber: p?.communication?.whatsapp ?? p?.whatsappNumber ?? s.whatsappNumber,
        channelLink: p?.communication?.channel ?? s.channelLink,
        libraryName: p?.libraryName ?? s.libraryName,
        address: p?.address ?? s.address,
        city: p?.city ?? s.city,
        mapUrl: p?.mapUrl ?? s.mapUrl,
        whatsappGroup: p?.communityLinks?.whatsappGroup ?? s.whatsappGroup,
        whatsappChannel: p?.communityLinks?.whatsappChannel ?? s.whatsappChannel,
        telegram: p?.communityLinks?.telegram ?? s.telegram,
        logoUrl: p?.logoUrl ?? s.logoUrl,
      }));
    } catch (e: any) {
      const err = e as ApiError;
      Alert.alert('Error', err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const openVerifyMobile = () => {
    const d = String(form.phone || '').replace(/\D/g, '');
    const ten = d.length >= 12 && d.startsWith('91') ? d.slice(2, 12) : d.slice(0, 10);
    if (!/^\d{10}$/.test(ten)) {
      Alert.alert('Phone required', 'Save a valid 10-digit Indian mobile number first, then verify.');
      return;
    }
    setOtpDigits(['', '', '', '', '', '']);
    setOtpFocusIndex(0);
    setVerifyMobileOpen(true);
  };

  const sendProfileMobileOtp = async () => {
    setVerifySendLoading(true);
    try {
      await apiPost('/api/library/profile/send-mobile-verify-otp');
      if (resendRestartNextSend.current) {
        resendRestartNextSend.current = false;
        setResendTimerKey((k) => k + 1);
      }
      Alert.alert('OTP sent', 'Enter the code we sent to your registered phone.');
    } catch (e: any) {
      const err = e as ApiError;
      Alert.alert('Could not send', err?.message || 'Failed to send OTP');
    } finally {
      setVerifySendLoading(false);
    }
  };

  const submitProfileMobileOtp = async () => {
    const digits = otpDigits.join('').replace(/\D/g, '');
    if (digits.length < 6) {
      Alert.alert('OTP', 'Enter the 6-digit verification code.');
      return;
    }
    setVerifySubmitLoading(true);
    try {
      const res = await apiPost<{ ok: boolean; profile?: { isMobileVerified?: boolean; phone?: string } }>(
        '/api/library/profile/verify-mobile-otp',
        { otp: digits }
      );
      setIsMobileVerified(Boolean(res.profile?.isMobileVerified));
      useAppStore.getState().patchCurrentUser({
        isMobileVerified: Boolean(res.profile?.isMobileVerified),
        phone: res.profile?.phone ?? useAppStore.getState().currentUser?.phone,
      });
      setVerifyMobileOpen(false);
      setOtpDigits(['', '', '', '', '', '']);
      setVerifySuccessModalOpen(true);
    } catch (e: any) {
      const err = e as ApiError;
      Alert.alert('Verification failed', err?.message || 'Invalid or expired OTP');
    } finally {
      setVerifySubmitLoading(false);
    }
  };

  const handleOtpCellChange = (index: number, text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      setOtpDigits((prev) => {
        const next = [...prev];
        chars.forEach((ch, j) => {
          const t = index + j;
          if (t < 6) next[t] = ch;
        });
        return next;
      });
      const last = Math.min(index + chars.length - 1, 5);
      setOtpFocusIndex(last);
      setTimeout(() => otpInputRefs.current[last]?.focus(), 0);
      return;
    }
    const digit = cleaned.slice(-1);
    if (digit) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = digit;
        return next;
      });
      if (index < 5) {
        setOtpFocusIndex(index + 1);
        setTimeout(() => otpInputRefs.current[index + 1]?.focus(), 0);
      } else {
        setOtpFocusIndex(5);
      }
    } else {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
    }
  };

  const handleOtpKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key !== 'Backspace') return;
    setOtpDigits((prev) => {
      if (prev[index] !== '') return prev;
      if (index === 0) return prev;
      const next = [...prev];
      next[index - 1] = '';
      setOtpFocusIndex(index - 1);
      setTimeout(() => otpInputRefs.current[index - 1]?.focus(), 0);
      return next;
    });
  };

  const onPressResendOtp = () => {
    resendRestartNextSend.current = true;
    void sendProfileMobileOtp();
  };

  const openGoogleMaps = async () => {
    const direct = String(form.mapUrl || '').trim();
    if (direct) {
      try {
        const ok = await Linking.canOpenURL(direct);
        if (!ok) {
          Alert.alert('Maps', 'Invalid map link URL.');
          return;
        }
        await Linking.openURL(direct);
        return;
      } catch {
        Alert.alert('Maps', 'Invalid map link URL.');
        return;
      }
    }
    const q = [form.libraryName, form.address, form.city].map((s) => String(s || '').trim()).filter(Boolean).join(', ');
    if (!q) {
      Alert.alert('Missing address', 'Please add your library address/city first.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert('Maps', 'Could not open Google Maps.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Maps', 'Could not open Google Maps.');
    }
  };

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: theme.colors.mutedText, fontWeight: '800' }}>Loading…</Text>
        </View>
      ) : (
        <>
          {error ? <Text style={styles.errTxt}>{error}</Text> : null}

          {/* Profile card */}
          <View style={[styles.card, styles.profileCard]}>
            <TouchableOpacity onPress={pickLogo} activeOpacity={0.85} style={styles.avatarWrap}>
              {logoPreview || form.logoUrl ? (
                <Image source={{ uri: logoPreview || form.logoUrl || undefined }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarTxt}>{initial}</Text>
                </View>
              )}
              <View style={styles.cameraDot}>
                {uploading ? <ActivityIndicator size={10} color="#fff" /> : <Ionicons name="camera" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.name} numberOfLines={1}>{form.name || '—'}</Text>
              <Text style={styles.email} numberOfLines={1}>{form.email || '—'}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>ACCOUNT OWNER</Text>
              </View>
            </View>

            {logoPreview ? (
              <TouchableOpacity
                onPress={uploadLogo}
                disabled={uploading}
                activeOpacity={0.85}
                style={[styles.logoBtn, uploading && { opacity: 0.6 }]}
              >
                <Text style={styles.logoBtnTxt}>Upload Logo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Total seats (library capacity) */}
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>SEATING</Text>
            <TouchableOpacity onPress={openEditSeats} activeOpacity={0.85} style={[styles.smallBtn, { marginTop: 18 }]}>
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.smallBtnTxt}>Edit total seats</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Total seats</Text>
            <Text style={styles.seatTotalBig}>{currentSeatTotal > 0 ? currentSeatTotal : '—'}</Text>
            <Text style={styles.seatTotalHint}>
              {currentSeatTotal > 0
                ? `Seats are numbered 1–${currentSeatTotal}. Lowering the count removes high-number seats only when they have no active assignments.`
                : 'Set how many numbered seats your library has. You can change this anytime.'}
            </Text>
          </View>

          {/* Basic info */}
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>BASIC INFO</Text>
            <TouchableOpacity
              onPress={() => setEditingBasic((s) => !s)}
              activeOpacity={0.85}
              style={styles.smallBtn}
              accessibilityRole="button"
              accessibilityLabel={editingBasic ? 'Stop editing basic info' : 'Edit basic info'}
            >
              <Ionicons name={editingBasic ? 'checkmark-outline' : 'create-outline'} size={16} color={theme.colors.primary} />
              <Text style={styles.smallBtnTxt}>{editingBasic ? 'Done' : 'Edit details'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <InputField
              label="Full Name"
              icon="person-outline"
              value={form.name}
              onChange={(v) => setForm((s) => ({ ...s, name: v }))}
              editable={editingBasic}
            />
            <View style={styles.divider} />
            <InputField label="Email Address" icon="mail-outline" value={form.email} editable={false} onChange={() => { }} />
            <View style={styles.divider} />
            <InputField
              label="Phone Number"
              icon="call-outline"
              value={form.phone}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
              keyboardType="phone-pad"
              editable={editingBasic}
            />
            {!isMobileVerified ? (
              <View style={styles.verifyRow}>
                <Text style={styles.verifyHint}>Confirm your phone with a one-time code.</Text>
                <TouchableOpacity
                  onPress={openVerifyMobile}
                  activeOpacity={0.85}
                  style={styles.verifyBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Verify mobile number"
                >
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.verifyBtnTxt}>Verify mobile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.verifiedRowTxt}>Mobile verified</Text>
              </View>
            )}
            <View style={styles.divider} />
            <InputField
              label="WhatsApp Number"
              icon="logo-whatsapp"
              value={form.whatsappNumber}
              onChange={(v) => setForm((s) => ({ ...s, whatsappNumber: v }))}
              keyboardType="phone-pad"
              editable={editingBasic}
            />
            <View style={styles.divider} />
            <InputField
              label="Channel Link"
              icon="megaphone-outline"
              value={form.channelLink}
              onChange={(v) => setForm((s) => ({ ...s, channelLink: v }))}
              editable={editingBasic}
            />
          </View>

          {/* Business details */}
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>BUSINESS DETAILS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setEditingBusiness((s) => !s)}
                activeOpacity={0.85}
                style={styles.smallBtn}
                accessibilityRole="button"
                accessibilityLabel={editingBusiness ? 'Stop editing business details' : 'Edit business details'}
              >
                <Ionicons name={editingBusiness ? 'checkmark-outline' : 'create-outline'} size={16} color={theme.colors.primary} />
                <Text style={styles.smallBtnTxt}>{editingBusiness ? 'Done' : 'Edit details'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickLogo}
                activeOpacity={0.85}
                style={styles.smallBtn}
                accessibilityRole="button"
                accessibilityLabel="Change logo"
              >
                <Ionicons name="image-outline" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.card}>
            <InputField
              label="Library Name"
              icon="business-outline"
              value={form.libraryName}
              onChange={(v) => setForm((s) => ({ ...s, libraryName: v }))}
              editable={editingBusiness}
            />
            <View style={styles.divider} />
            <InputField
              label="Full Address"
              icon="location-outline"
              value={form.address}
              onChange={(v) => setForm((s) => ({ ...s, address: v }))}
              multiline
              editable={editingBusiness}
            />
            <View style={styles.divider} />
            <InputField
              label="City"
              icon="map-outline"
              value={form.city}
              onChange={(v) => setForm((s) => ({ ...s, city: v }))}
              editable={editingBusiness}
            />
            <View style={styles.divider} />
            <InputField
              label="Map link URL"
              icon="link-outline"
              value={form.mapUrl}
              onChange={(v) => setForm((s) => ({ ...s, mapUrl: v }))}
              keyboardType="url"
              editable={editingBusiness}
            />
            <TouchableOpacity
              onPress={openGoogleMaps}
              activeOpacity={0.85}
              style={styles.mapBtn}
              accessibilityRole="button"
              accessibilityLabel="Open location in Google Maps"
            >
              <Ionicons name="navigate-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.mapBtnTxt}>Open location in Google Maps</Text>
              <Ionicons name="open-outline" size={16} color={theme.colors.mutedText} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          {/* Community links */}
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>COMMUNITY LINKS</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.mutedText }}>Optional</Text>
          </View>
          <View style={styles.card}>
            <InputField
              label="WhatsApp Group URL"
              icon="logo-whatsapp"
              value={form.whatsappGroup}
              onChange={(v) => setForm((s) => ({ ...s, whatsappGroup: v }))}
              keyboardType="url"
              editable={editingBusiness}
            />
            <View style={styles.divider} />
            <InputField
              label="WhatsApp Channel URL"
              icon="megaphone-outline"
              value={form.whatsappChannel}
              onChange={(v) => setForm((s) => ({ ...s, whatsappChannel: v }))}
              keyboardType="url"
              editable={editingBusiness}
            />
            <View style={styles.divider} />
            <InputField
              label="Telegram URL"
              icon="paper-plane-outline"
              value={form.telegram}
              onChange={(v) => setForm((s) => ({ ...s, telegram: v }))}
              keyboardType="url"
              editable={editingBusiness}
            />
          </View>

          {/* Save */}
          <TouchableOpacity onPress={save} activeOpacity={0.9} style={[styles.saveBtn, saving && { opacity: 0.7 }]} disabled={saving}>
            <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save Profile'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('LibraryChangePassword')}
            activeOpacity={0.85}
            style={styles.changePwBtn}
            accessibilityRole="button"
            accessibilityLabel="Change password"
          >
            <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.changePwTxt}>Change password</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedText} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </>
      )}
      </ScrollView>

      <Modal visible={editSeatsOpen} transparent animationType="fade" onRequestClose={() => !seatsSaving && setEditSeatsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit total seats</Text>
            <Text style={styles.modalHint}>Enter the total number of seats (1–5000). This updates the seat map in Seat management.</Text>
            <TextInput
              value={totalSeatsDraft}
              onChangeText={setTotalSeatsDraft}
              keyboardType="number-pad"
              placeholder="e.g. 100"
              placeholderTextColor={theme.colors.mutedText}
              style={styles.modalInput}
              editable={!seatsSaving}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => !seatsSaving && setEditSeatsOpen(false)}
                disabled={seatsSaving}
              >
                <Text style={styles.modalBtnGhostTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={saveSeatTotal} disabled={seatsSaving}>
                <Text style={styles.modalBtnPrimaryTxt}>{seatsSaving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={verifyMobileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !verifySendLoading && !verifySubmitLoading && setVerifyMobileOpen(false)}
      >
        <View style={styles.verifyMobileBackdrop}>
          <View style={styles.verifyMobileCard}>
            <View style={styles.verifyMobileHeaderRow}>
              <View style={styles.verifyMobileIconBox}>
                <Ionicons name="phone-portrait-outline" size={22} color="#0d9488" />
              </View>
              <View style={styles.verifyMobileTitleCol}>
                <Text style={styles.verifyMobileTitle}>Verify mobile</Text>
                <Text style={styles.verifyMobileSubtitle}>
                  {String(form.phone || '').trim() || '—'}
                </Text>
              </View>
            </View>

            <Text style={styles.verifyMobileDesc}>
              Enter the 6-digit code we texted. If you edited the number, tap{' '}
              <Text style={styles.verifyMobileSaveHint}>Save Profile</Text> first.
            </Text>

            <TouchableOpacity
              style={styles.verifyMobileSendRow}
              onPress={() => void sendProfileMobileOtp()}
              disabled={verifySendLoading || verifySubmitLoading}
              activeOpacity={0.88}
            >
              <Text style={styles.verifyMobileSendRowTxt}>
                {verifySendLoading ? 'Sending…' : 'Send verification code'}
              </Text>
            </TouchableOpacity>

            <View style={styles.verifyMobileOtpRow}>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const digit = otpDigits[i] ?? '';
                const focused = otpFocusIndex === i;
                const filled = digit.length > 0;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.9}
                    style={[
                      styles.verifyMobileOtpCell,
                      (filled || focused) && styles.verifyMobileOtpCellFilled,
                    ]}
                    onPress={() => {
                      setOtpFocusIndex(i);
                      otpInputRefs.current[i]?.focus();
                    }}
                    disabled={verifySubmitLoading}
                  >
                    {digit ? <Text style={styles.verifyMobileOtpCellText}>{digit}</Text> : null}
                    {focused && !digit ? (
                      <Animated.View style={[styles.verifyMobileOtpCursor, { opacity: cursorBlink }]} />
                    ) : null}
                    <TextInput
                      ref={(r) => {
                        otpInputRefs.current[i] = r;
                      }}
                      value={digit}
                      onChangeText={(t) => handleOtpCellChange(i, t)}
                      onKeyPress={(e) => handleOtpKeyPress(i, e)}
                      onFocus={() => setOtpFocusIndex(i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      editable={!verifySubmitLoading}
                      style={styles.verifyMobileOtpCellInput}
                      caretHidden
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.verifyMobileResendRow}>
              {!canResend ? (
                <>
                  <Ionicons name="time-outline" size={12} color="#94a3b8" />
                  <Text style={styles.verifyMobileResendMuted}>Resend code in </Text>
                  <Text style={styles.verifyMobileResendTime}>
                    {Math.floor(resendSeconds / 60)}:{String(resendSeconds % 60).padStart(2, '0')}
                  </Text>
                </>
              ) : (
                <TouchableOpacity onPress={onPressResendOtp} disabled={verifySendLoading} activeOpacity={0.75}>
                  <Text style={styles.verifyMobileResendLink}>
                    {verifySendLoading ? 'Sending…' : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.verifyMobileActionsRow}>
              <TouchableOpacity
                style={styles.verifyMobileCancelBtn}
                onPress={() => !verifySendLoading && !verifySubmitLoading && setVerifyMobileOpen(false)}
                disabled={verifySendLoading || verifySubmitLoading}
                activeOpacity={0.88}
              >
                <Text style={styles.verifyMobileCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.verifyMobileVerifyBtn,
                  (otpDigits.join('').replace(/\D/g, '').length < 6 || verifySubmitLoading) &&
                    styles.verifyMobileVerifyBtnDisabled,
                ]}
                onPress={submitProfileMobileOtp}
                disabled={otpDigits.join('').replace(/\D/g, '').length < 6 || verifySubmitLoading}
                activeOpacity={0.88}
              >
                <Ionicons name="shield-checkmark-outline" size={15} color="#fff" />
                <Text style={styles.verifyMobileVerifyTxt}>
                  {verifySubmitLoading ? 'Checking…' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={verifySuccessModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifySuccessModalOpen(false)}
      >
        <View style={styles.verifyMobileBackdrop}>
          <View style={styles.verifySuccessCard}>
            <View style={styles.verifySuccessIconCircle}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#0d9488" />
            </View>
            <Text style={styles.verifySuccessTitle}>Mobile verified!</Text>
            <Text style={styles.verifySuccessDesc}>Your number has been verified successfully.</Text>
            <TouchableOpacity
              style={styles.verifySuccessDoneBtn}
              onPress={() => setVerifySuccessModalOpen(false)}
              activeOpacity={0.88}
            >
              <Ionicons name="checkmark" size={15} color="#fff" />
              <Text style={styles.verifySuccessDoneTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function InputField(props: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChange: (v: string) => void;
  editable?: boolean;
  multiline?: boolean;
  keyboardType?: any;
}) {
  const { label, icon, value, onChange, editable = true, multiline = false, keyboardType } = props;
  const { mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(), [mode]);
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, multiline && styles.inputShellMultiline]}>
        <Ionicons name={icon as any} size={18} color={theme.colors.mutedText} />
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={editable}
          multiline={multiline}
          keyboardType={keyboardType}
          placeholder={label}
          placeholderTextColor={theme.colors.mutedText}
          style={[
            styles.input,
            !editable && { color: theme.colors.mutedText },
            multiline && styles.inputMultiline,
          ]}
        />
      </View>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: 140 },
    center: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
    errTxt: { color: theme.colors.danger, fontWeight: '900', marginBottom: 10 },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 30 },
    backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },

    sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 12, fontWeight: '900', color: theme.colors.mutedText, letterSpacing: 1.2 },

    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },

    profileCard: { alignItems: 'center' },
    avatarWrap: { width: 74, height: 74, borderRadius: 24, overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    avatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,148,136,0.12)' },
    avatarTxt: { fontSize: 22, fontWeight: '900', color: theme.colors.primary },
    cameraDot: { position: 'absolute', right: 6, bottom: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.dark, alignItems: 'center', justifyContent: 'center' },

    profileInfo: { alignItems: 'center', marginTop: 12 },
    name: { fontSize: 16, fontWeight: '900', color: theme.colors.text, textAlign: 'center' },
    email: { marginTop: 4, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText, textAlign: 'center' },
    badge: {
      marginTop: 10,
      alignSelf: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(13,148,136,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(13,148,136,0.28)',
    },
    badgeTxt: { fontSize: 10, fontWeight: '900', color: theme.colors.primary, letterSpacing: 0.5 },

    logoBtn: {
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignSelf: 'center',
    },
    logoBtnTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.text },

    fieldLabel: { fontSize: 11, fontWeight: '900', color: theme.colors.mutedText, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 6 },
    inputShell: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 12, backgroundColor: theme.colors.surface },
    input: { flex: 1, minHeight: 46, fontSize: 14, fontWeight: '800', color: theme.colors.text, paddingVertical: Platform.OS === 'ios' ? 12 : 10 },
    inputShellMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
    inputMultiline: { minHeight: 110, textAlignVertical: 'top', paddingVertical: 0 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },

    mapBtn: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mapBtnTxt: { fontSize: 13, fontWeight: '900', color: theme.colors.text },

    smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
    smallBtnTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.primary },

    saveBtn: { marginTop: 18, backgroundColor: theme.colors.primary, borderRadius: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    saveTxt: { color: '#fff', fontWeight: '900', letterSpacing: 0.7 },

    changePwBtn: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    changePwTxt: { fontSize: 13, fontWeight: '900', color: theme.colors.text },

    seatTotalBig: { marginTop: 4, fontSize: 28, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 },
    seatTotalHint: { marginTop: 10, fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, lineHeight: 18 },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 22 },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    modalTitle: { fontSize: 17, fontWeight: '900', color: theme.colors.text },
    modalHint: { marginTop: 8, fontSize: 13, fontWeight: '600', color: theme.colors.mutedText, lineHeight: 18, marginBottom: 12 },
    modalInput: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      minHeight: 48,
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.text,
    },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
    modalBtnGhost: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
    modalBtnGhostTxt: { fontSize: 14, fontWeight: '900', color: theme.colors.text },
    modalBtnPrimary: { backgroundColor: theme.colors.primary },
    modalBtnPrimaryTxt: { fontSize: 14, fontWeight: '900', color: '#fff' },

    verifyRow: { paddingVertical: 8, paddingHorizontal: 2, gap: 10 },
    verifyHint: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, lineHeight: 17 },
    verifyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      marginTop: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    verifyBtnTxt: { fontSize: 13, fontWeight: '900', color: theme.colors.primary },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
    verifiedRowTxt: { fontSize: 13, fontWeight: '800', color: '#15803D' },

    verifyMobileBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
    },
    verifyMobileCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 18,
      ...theme.shadow.card,
    },
    verifyMobileHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    verifyMobileIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#f0fdfa',
      borderWidth: 1,
      borderColor: '#0d9488',
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifyMobileTitleCol: { flex: 1, paddingTop: 2 },
    verifyMobileTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    verifyMobileSubtitle: { marginTop: 4, fontSize: 10, color: theme.colors.mutedText },
    verifyMobileDesc: { marginTop: 14, fontSize: 11, color: theme.colors.mutedText, lineHeight: 17 },
    verifyMobileSaveHint: { color: '#0d9488', fontWeight: '700' },
    verifyMobileSendRow: {
      marginTop: 12,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#0d9488',
      backgroundColor: '#f0fdfa',
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifyMobileSendRowTxt: { fontSize: 12, fontWeight: '700', color: '#0d9488' },
    verifyMobileOtpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 18 },
    verifyMobileOtpCell: {
      width: 42,
      height: 50,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    verifyMobileOtpCellFilled: {
      borderColor: '#0d9488',
      backgroundColor: '#f0fdfa',
    },
    verifyMobileOtpCellText: { fontSize: 20, fontWeight: '600', color: '#0d9488' },
    verifyMobileOtpCellInput: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      opacity: 0,
    },
    verifyMobileOtpCursor: {
      position: 'absolute',
      width: 2,
      height: 20,
      borderRadius: 1,
      backgroundColor: '#0d9488',
    },
    verifyMobileResendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 16 },
    verifyMobileResendMuted: { fontSize: 11, color: theme.colors.mutedText },
    verifyMobileResendTime: { fontSize: 11, color: '#0d9488', fontWeight: '700' },
    verifyMobileResendLink: { fontSize: 11, color: '#0d9488', fontWeight: '700' },
    verifyMobileActionsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    verifyMobileCancelBtn: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifyMobileCancelTxt: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
    verifyMobileVerifyBtn: {
      flex: 2,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#0d9488',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    verifyMobileVerifyBtnDisabled: { opacity: 0.5 },
    verifyMobileVerifyTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    verifySuccessCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 22,
      alignItems: 'center',
      ...theme.shadow.card,
    },
    verifySuccessIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#f0fdfa',
      borderWidth: 1,
      borderColor: '#0d9488',
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifySuccessTitle: { marginTop: 16, fontSize: 16, fontWeight: '700', color: theme.colors.text },
    verifySuccessDesc: { marginTop: 8, fontSize: 12, color: theme.colors.mutedText, textAlign: 'center', lineHeight: 18 },
    verifySuccessDoneBtn: {
      marginTop: 20,
      width: '100%',
      height: 42,
      borderRadius: 12,
      backgroundColor: '#0d9488',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    verifySuccessDoneTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  });
}

