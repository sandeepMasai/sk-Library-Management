import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing as REasing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { apiPost, type ApiError } from '../../services/api';
import { theme } from '../../theme';
import { useAppStore, type User } from '../../store';
import { useTheme } from '../../theme/ThemeProvider';
import { ConfirmModal } from '../../components/ConfirmModal';
import OtpSixBoxes from '../../components/auth/OtpSixBoxes';
import { INDIA_STATE_CITIES, ALL_STATES } from './indiaRegisterLocations';
import AuthKeyboardScroll, {
  useAuthFieldFocus,
  useAuthKeyboardScrollOptional,
} from '../../components/auth/AuthKeyboardScroll';

type RegisterLibraryResponse = {
  user: User;
  authToken: string;
  libraryCode?: string;
};

type PickerMode = 'state' | 'city' | null;

function normalizeRegisterMobileDigits(raw: string): string {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('91') && d.length >= 12) d = d.slice(2);
  return d.slice(0, 10);
}

function isValidRegisterEmail(raw: string): boolean {
  const s = String(raw || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const SCREEN_WIDTH = Dimensions.get('window').width;

function GradientPrimaryButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: object;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const blocked = Boolean(props.disabled || props.loading);
  const pressIn = () => {
    if (!blocked) {
      Animated.spring(scale, {
        toValue: 0.97,
        friction: 6,
        tension: 160,
        useNativeDriver: true,
      }).start();
    }
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 160, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={props.onPress}
      disabled={blocked}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
    >
      <Animated.View style={[{ transform: [{ scale }] }, props.style]}>
        <AnimatedLinearGradient
          colors={blocked ? ['#cbd5e1', '#94a3b8'] : ['#5eead4', '#14b8a6', '#0d9488']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={gradientBtnInnerStyles.fill}
        >
          {props.loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {props.icon ? <Ionicons name={props.icon} size={18} color="#fff" /> : null}
              <Text style={gradientBtnInnerStyles.label}>{props.title}</Text>
            </View>
          )}
        </AnimatedLinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const gradientBtnInnerStyles = StyleSheet.create({
  fill: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
});

function PremiumField(props: {
  label: string;
  requiredStar?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  rightSlot?: React.ReactNode;
} & Omit<React.ComponentProps<typeof TextInput>, 'style'>) {
  const { mode } = useTheme();
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef<View>(null);
  const kbScroll = useAuthKeyboardScrollOptional();
  const {
    label,
    requiredStar,
    icon,
    error,
    rightSlot,
    onFocus,
    onBlur,
    ...inputProps
  } = props;
  const softBg =
    mode === 'dark' ? 'rgba(30,41,59,0.45)' : '#f4f7fb';
  const softBgFocus = mode === 'dark' ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.07)';

  return (
    <View ref={fieldRef} collapsable={false} style={{ marginTop: 10 }}>
      <Text style={premiumStyles.label}>
        {label}
        {requiredStar ? <Text style={{ color: '#e24b4a' }}> *</Text> : null}
      </Text>
      <View
        style={[
          premiumStyles.row,
          {
            borderColor: error ? '#f87171' : focused ? '#0d9488' : theme.colors.border,
            backgroundColor: focused ? softBgFocus : softBg,
            shadowOpacity: focused ? 0.12 : 0,
            shadowRadius: focused ? 10 : 0,
            shadowOffset: { width: 0, height: focused ? 4 : 0 },
            shadowColor: '#0d9488',
            elevation: focused ? 3 : 0,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={focused ? '#0d9488' : stylesVars.icon} />
        <TextInput
          {...inputProps}
          style={premiumStyles.input}
          placeholderTextColor={theme.colors.mutedText}
          onFocus={(e) => {
            setFocused(true);
            kbScroll?.onFieldFocus(fieldRef.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {rightSlot}
      </View>
      {error ? <Text style={premiumStyles.error}>{error}</Text> : null}
    </View>
  );
}

const premiumStyles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.mutedText,
    letterSpacing: 0.85,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text, paddingVertical: Platform.OS === 'ios' ? 12 : 10 },
  error: { fontSize: 11, fontWeight: '700', color: '#dc2626', marginTop: 4 },
});

// ─── EmailVerifyBlock ────────────────────────────────────────────────────────
// Self-contained email-field + send-code button + verified chip below the row.
// The verified chip is NEVER inside the input row, so no overflow on any screen.
function EmailVerifyBlock({
  mode,
  email,
  registrationToken,
  otpSending,
  resendSec,
  onChangeEmail,
  onSend,
}: {
  mode: 'light' | 'dark';
  email: string;
  registrationToken: string | null;
  otpSending: boolean;
  resendSec: number;
  onChangeEmail: (t: string) => void;
  onSend: () => void;
}) {
  // Animate verified chip in
  const chipScale = useSharedValue(0.72);
  const chipOpacity = useSharedValue(0);

  useEffect(() => {
    if (registrationToken) {
      chipScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      chipOpacity.value = withTiming(1, { duration: 260, easing: REasing.out(REasing.quad) });
    } else {
      chipScale.value = withTiming(0.72, { duration: 160 });
      chipOpacity.value = withTiming(0, { duration: 160 });
    }
  }, [registrationToken, chipScale, chipOpacity]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chipScale.value }],
    opacity: chipOpacity.value,
  }));

  const softBg = mode === 'dark' ? 'rgba(30,41,59,0.45)' : '#f4f7fb';
  const verifiedBg = mode === 'dark' ? 'rgba(16,185,129,0.14)' : '#f0fdf4';
  const verifiedBorder = mode === 'dark' ? '#34d399' : '#059669';
  const chipBg = mode === 'dark' ? 'rgba(16,185,129,0.2)' : '#ecfdf5';

  const isVerified = Boolean(registrationToken);
  const sendDisabled = otpSending || resendSec > 0 || !isValidRegisterEmail(email);
  const emailWrapRef = useRef<View>(null);
  const kbScroll = useAuthKeyboardScrollOptional();

  return (
    <View ref={emailWrapRef} collapsable={false} style={evStyles.wrap}>
      <Text style={evStyles.label}>
        Email <Text style={{ color: '#e24b4a' }}>*</Text>
      </Text>

      {/* Input row — contains only icon + text input + send button */}
      <View
        style={[
          evStyles.row,
          { backgroundColor: isVerified ? verifiedBg : softBg },
          { borderColor: isVerified ? verifiedBorder : theme.colors.border },
        ]}
      >
        <Ionicons
          name="mail-outline"
          size={18}
          color={isVerified ? '#059669' : '#94a3b8'}
          style={{ flexShrink: 0 }}
        />
        <TextInput
          value={email}
          onChangeText={onChangeEmail}
          placeholder="owner@example.com"
          placeholderTextColor={theme.colors.mutedText}
          style={evStyles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isVerified}
          onFocus={() => kbScroll?.onFieldFocus(emailWrapRef.current)}
        />
        {/* Send-code button — only visible when NOT verified */}
        {!isVerified && (
          <Pressable
            onPress={onSend}
            disabled={sendDisabled}
            style={({ pressed }) => [
              evStyles.sendWrap,
              sendDisabled && { opacity: 0.42 },
              pressed && { opacity: 0.82 },
            ]}
          >
            <LinearGradient
              colors={['#5eead4', '#0d9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={evStyles.sendGrad}
            >
              {otpSending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={evStyles.sendTxt} numberOfLines={1}>
                  {resendSec > 0 ? `${resendSec}s` : 'Send code'}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Verified chip — sits BELOW the row, never inside it */}
      {isVerified && (
        <Reanimated.View style={[evStyles.chipRow, chipStyle]}>
          <View
            style={[
              evStyles.chip,
              { backgroundColor: chipBg, borderColor: verifiedBorder },
            ]}
          >
            <Ionicons name="checkmark-circle" size={15} color="#059669" />
            <Text style={[evStyles.chipTxt, mode === 'dark' && { color: '#34d399' }]}>
              ✓ Verified
            </Text>
          </View>
        </Reanimated.View>
      )}

      {/* Hint lines */}
      {!isVerified && (
        <Text style={evStyles.hint}>
          Tap &quot;Send code&quot; — we&apos;ll open a popup to enter your OTP.
        </Text>
      )}
      {!isVerified && resendSec > 0 && (
        <Text style={evStyles.resend}>You can resend after the timer.</Text>
      )}
      {isVerified && (
        <Text style={evStyles.successHint}>Email verified — continue below.</Text>
      )}
    </View>
  );
}

const evStyles = StyleSheet.create({
  wrap: { marginTop: 8 },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.mutedText,
    letterSpacing: 0.85,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    minHeight: 48,
    // No gap here — we let flexbox distribute; gap causes Android measure issues
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 8,
    minWidth: 0,
  },
  sendWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    marginLeft: 6,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  sendGrad: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    minWidth: 72,
    maxWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  sendTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  chipRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  chipTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    lineHeight: 16,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.mutedText,
    lineHeight: 17,
  },
  resend: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },
  successHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    lineHeight: 17,
  },
});

function RegisterPincodeField({
  styles,
  pincode,
  setPincode,
  selectedCity,
  error,
  clearError,
}: {
  styles: ReturnType<typeof makeStyles>;
  pincode: string;
  setPincode: (v: string) => void;
  selectedCity: string;
  error?: string;
  clearError: () => void;
}) {
  const { wrapRef, onInputFocus } = useAuthFieldFocus();

  return (
    <View ref={wrapRef} collapsable={false} style={styles.fieldWrapTight}>
      <Text style={styles.fieldLabel}>
        PIN code <Text style={{ color: '#e24b4a' }}>*</Text>
      </Text>
      <View
        style={[
          styles.pickerRow,
          !selectedCity && styles.pickerRowMuted,
          !!error && styles.pickerRowError,
        ]}
      >
        <Ionicons name="keypad-outline" size={18} color="#94a3b8" />
        <TextInput
          value={pincode}
          onChangeText={(t) => {
            setPincode(t.replace(/\D/g, '').slice(0, 6));
            clearError();
          }}
          placeholder={selectedCity ? '6-digit PIN' : 'Select city first'}
          placeholderTextColor={theme.colors.mutedText}
          style={[styles.pickerInput, { flex: 1 }]}
          keyboardType="number-pad"
          maxLength={6}
          editable={!!selectedCity}
          autoCorrect={false}
          onFocus={onInputFocus}
        />
      </View>
      {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
    </View>
  );
}

function RegisterPlaceField({
  styles,
  place,
  setPlace,
  error,
  clearError,
}: {
  styles: ReturnType<typeof makeStyles>;
  place: string;
  setPlace: (v: string) => void;
  error?: string;
  clearError: () => void;
}) {
  const { wrapRef, onInputFocus } = useAuthFieldFocus();

  return (
    <View ref={wrapRef} collapsable={false} style={styles.fieldWrapTight}>
      <Text style={styles.fieldLabel}>
        Place / area <Text style={{ color: '#e24b4a' }}>*</Text>
      </Text>
      <View style={[styles.pickerRow, !!error && styles.pickerRowError]}>
        <Ionicons name="navigate-outline" size={18} color="#94a3b8" />
        <TextInput
          value={place}
          onChangeText={(t) => {
            setPlace(t);
            clearError();
          }}
          placeholder="Landmark or locality"
          placeholderTextColor={theme.colors.mutedText}
          style={[styles.pickerInput, { flex: 1 }]}
          autoCorrect={false}
          autoCapitalize="sentences"
          returnKeyType="next"
          maxLength={200}
          onFocus={onInputFocus}
        />
      </View>
      {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
    </View>
  );
}

/**
 * RegisterLibraryScreen
 * - UI: kept consistent with existing Login screen (same card + gradient feel).
 * - Connection: POST /api/auth/register-library using central Axios service.
 * - On success: store token + role + libraryId (tenant) and navigate to Library dashboard.
 */
export default function RegisterLibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(), [mode]);

  const [libraryName, setLibraryName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [place, setPlace] = useState('');
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [totalSeats, setTotalSeats] = useState('100');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [registerOtp, setRegisterOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendSec, setResendSec] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    state?: string;
    city?: string;
    pincode?: string;
    place?: string;
    mobile?: string;
    emailVerify?: string;
  }>({});
  const [infoModal, setInfoModal] = useState<{ title: string; description?: string } | null>(null);
  const [otpVerifyModalVisible, setOtpVerifyModalVisible] = useState(false);
  const [otpModalPhase, setOtpModalPhase] = useState<'code' | 'done'>('code');
  const otpSuccessTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (otpSuccessTimerRef.current) clearTimeout(otpSuccessTimerRef.current);
    };
  }, []);

  const availableCities = useMemo(
    () => (selectedState ? INDIA_STATE_CITIES[selectedState] ?? [] : []),
    [selectedState]
  );

  const pickerList = useMemo(() => {
    const list = pickerMode === 'state' ? ALL_STATES : availableCities;
    if (!pickerSearch.trim()) return list;
    const q = pickerSearch.trim().toLowerCase();
    return list.filter((item) => item.toLowerCase().includes(q));
  }, [pickerMode, pickerSearch, availableCities]);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  const sendRegisterEmailOtp = async () => {
    Keyboard.dismiss();
    setError(null);
    setErrors((e) => ({ ...e, emailVerify: undefined }));
    const em = email.trim().toLowerCase();
    if (!isValidRegisterEmail(em)) {
      setInfoModal({
        title: 'Invalid email',
        description: 'Enter a valid email address before requesting a code.',
      });
      return;
    }
    setRegistrationToken(null);
    setRegisterOtp('');
    setOtpSending(true);
    try {
      const response = await apiPost<{ ok: boolean; message?: string; resendAfterSeconds?: number }>(
        '/api/auth/library-register/send-otp',
        { email: em }
      );
      setResendSec(response.resendAfterSeconds ?? 60);
      setRegisterOtp('');
      setErrors((e) => ({ ...e, emailVerify: undefined }));
      setOtpModalPhase('code');
      setOtpVerifyModalVisible(true);
    } catch (e) {
      const err = e as ApiError;
      setError(err?.message || 'Could not send verification code.');
    } finally {
      setOtpSending(false);
    }
  };

  const closeOtpModal = () => {
    if (otpVerifying || otpModalPhase === 'done') return;
    Keyboard.dismiss();
    setOtpVerifyModalVisible(false);
    setErrors((e) => ({ ...e, emailVerify: undefined }));
    setRegisterOtp('');
  };

  const verifyRegisterEmailOtp = async () => {
    Keyboard.dismiss();
    setErrors((e) => ({ ...e, emailVerify: undefined }));
    const em = email.trim().toLowerCase();
    const otp = registerOtp.replace(/\D/g, '').slice(0, 6);
    if (!isValidRegisterEmail(em) || otp.length !== 6) {
      setErrors((e) => ({ ...e, emailVerify: 'Enter the 6-digit code from your email.' }));
      return;
    }
    setOtpVerifying(true);
    try {
      const response = await apiPost<{
        ok: boolean;
        registrationToken?: string;
        sessionExpiresMinutes?: number;
      }>('/api/auth/library-register/verify-otp', { email: em, otp });
      if (!response.registrationToken) {
        setErrors((e) => ({
          ...e,
          emailVerify: 'Verification incomplete. Try again or request a new code.',
        }));
        return;
      }
      setRegistrationToken(response.registrationToken);
      setRegisterOtp('');
      setOtpModalPhase('done');
      if (otpSuccessTimerRef.current) clearTimeout(otpSuccessTimerRef.current);
      otpSuccessTimerRef.current = setTimeout(() => {
        otpSuccessTimerRef.current = null;
        setOtpVerifyModalVisible(false);
        setOtpModalPhase('code');
      }, 1400);
    } catch (e) {
      const err = e as ApiError;
      setErrors((e) => ({
        ...e,
        emailVerify: err?.message || 'Could not verify code.',
      }));
    } finally {
      setOtpVerifying(false);
    }
  };

  const canSubmit = useMemo(() => {
    const phoneDigits = normalizeRegisterMobileDigits(mobile);
    const phoneOk = phoneDigits.length === 0 || phoneDigits.length === 10;
    return Boolean(
      libraryName.trim() &&
        ownerName.trim() &&
        selectedState &&
        selectedCity &&
        /^\d{6}$/.test(pincode.replace(/\D/g, '')) &&
        place.trim() &&
        totalSeats.trim() &&
        email.trim() &&
        isValidRegisterEmail(email) &&
        phoneOk &&
        password.trim() &&
        registrationToken
    );
  }, [
    libraryName,
    ownerName,
    selectedState,
    selectedCity,
    pincode,
    place,
    totalSeats,
    email,
    mobile,
    password,
    registrationToken,
  ]);

  function openPicker(mode: PickerMode) {
    Keyboard.dismiss();
    setPickerSearch('');
    setPickerMode(mode);
  }

  function onPickerSelect(value: string) {
    if (pickerMode === 'state') {
      if (value !== selectedState) {
        setSelectedState(value);
        setSelectedCity('');
        setPincode('');
        setPlace('');
        setErrors((e) => ({ ...e, city: undefined, pincode: undefined, place: undefined }));
      }
    } else {
      setSelectedCity(value);
      setPincode('');
      setErrors((e) => ({ ...e, pincode: undefined }));
    }
    setPickerMode(null);
    setPickerSearch('');
  }

  const onSubmit = async () => {
    Keyboard.dismiss();
    setError(null);
    const nextErrors: {
      state?: string;
      city?: string;
      pincode?: string;
      place?: string;
      mobile?: string;
      emailVerify?: string;
    } = {};
    if (!selectedState) nextErrors.state = 'Please select a state';
    if (!selectedCity) nextErrors.city = 'Please select a city';
    const pinDigits = pincode.replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(pinDigits)) nextErrors.pincode = 'Enter a valid 6-digit PIN code';
    if (!place.trim()) nextErrors.place = 'Please enter area or place';
    const phoneDigits = normalizeRegisterMobileDigits(mobile);
    if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
      nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number';
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    if (!canSubmit) {
      setInfoModal({ title: 'Required', description: 'Please fill all fields.' });
      return;
    }

    if (!registrationToken) {
      setInfoModal({
        title: 'Verify email',
        description:
          'Tap “Send code”, enter the OTP in the popup, then verify before creating your library.',
      });
      return;
    }

    const seatsNum = Number(totalSeats);
    if (!Number.isInteger(seatsNum) || seatsNum < 1 || seatsNum > 5000) {
      setInfoModal({
        title: 'Invalid seats',
        description: 'Total seats must be a whole number between 1 and 5000.',
      });
      return;
    }

    setLoading(true);
    try {
      const phoneDigits = normalizeRegisterMobileDigits(mobile);
      const payload: Record<string, unknown> = {
        libraryName: libraryName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        city: selectedCity,
        state: selectedState,
        pincode: pincode.replace(/\D/g, '').slice(0, 6),
        place: place.trim(),
        emailVerificationToken: registrationToken,
      };
      if (phoneDigits.length === 10) {
        payload.phone = phoneDigits;
      }
      const response = await apiPost<
        RegisterLibraryResponse | { success: boolean; data: RegisterLibraryResponse; message?: string }
      >(`/api/auth/register-library`, payload);
      const data = 'success' in response ? response.data : response;

      useAppStore.setState((s) => ({
        currentUser: data.user,
        authToken: data.authToken,
        token: data.authToken,
        role: 'library',
        libraryId: data.user.id,
        libraryCode: data.user.libraryCode ?? data.libraryCode ?? s.libraryCode ?? null,
        users: [s.users[0], data.user, ...s.users.filter((u) => u.id !== data.user.id && u.role === 'student')],
      }));

      try {
        await useAppStore.getState().bulkCreateSeats(seatsNum, null);
        await useAppStore.getState().fetchSeats();
      } catch {
        // Non-fatal: library can create seats later from Seats screen.
      }

      if (Platform.OS === 'web') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Linking } = require('react-native');
        Linking.openURL('/dashboard');
      } else {
        navigation.navigate('LibraryRoot');
      }
    } catch (e: any) {
      const err = e as ApiError;
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#022c26', '#0f766e', '#0d9488', '#14b8a6', '#5eead4']}
        locations={[0, 0.28, 0.52, 0.78, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIconBadge}>
            <Ionicons name="library-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>SmartLibDesk</Text>
            <Text style={styles.heroTitle}>Create library</Text>
          </View>
        </View>
        <Text style={styles.heroSubtitle}>Start your workspace in minutes.</Text>
      </LinearGradient>

      <AuthKeyboardScroll
        contentContainerStyle={styles.scroll}
        extraBottomPadding={8}
      >
            <View style={[styles.card, mode === 'dark' && styles.cardDark]}>
              <Text style={styles.cardTitle}>Library details</Text>
              <Text style={styles.cardSubtitle}>Tell us about your space — quick & secure.</Text>

              <PremiumField
                label="Library name"
                requiredStar
                icon="business-outline"
                value={libraryName}
                onChangeText={setLibraryName}
                placeholder="e.g. Pritan Library"
              />
              <PremiumField
                label="Owner name"
                requiredStar
                icon="person-outline"
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Your name"
              />

              <View style={styles.fieldWrapTight}>
                <Text style={styles.fieldLabel}>
                  State <Text style={{ color: '#e24b4a' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.pickerRow, !!errors.state && styles.pickerRowError]}
                  onPress={() => openPicker('state')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="map-outline" size={18} color={selectedState ? '#0d9488' : '#94a3b8'} />
                  <Text style={[styles.pickerInput, !selectedState && { color: theme.colors.mutedText }]}>
                    {selectedState || 'Select state'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                </TouchableOpacity>
                {errors.state ? <Text style={styles.errorTxt}>{errors.state}</Text> : null}
              </View>

              <View style={styles.fieldWrapTight}>
                <Text style={styles.fieldLabel}>
                  City <Text style={{ color: '#e24b4a' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pickerRow,
                    !selectedState && styles.pickerRowMuted,
                    !!errors.city && styles.pickerRowError,
                  ]}
                  onPress={() => selectedState && openPicker('city')}
                  activeOpacity={0.88}
                  disabled={!selectedState}
                >
                  <Ionicons name="location-outline" size={18} color={selectedCity ? '#0d9488' : '#94a3b8'} />
                  <Text style={[styles.pickerInput, !selectedCity && { color: theme.colors.mutedText }]}>
                    {selectedCity || (selectedState ? 'Select city' : 'Select state first')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                </TouchableOpacity>
                {errors.city ? <Text style={styles.errorTxt}>{errors.city}</Text> : null}
              </View>

              <RegisterPincodeField
                styles={styles}
                pincode={pincode}
                setPincode={setPincode}
                selectedCity={selectedCity}
                error={errors.pincode}
                clearError={() => setErrors((e) => ({ ...e, pincode: undefined }))}
              />

              <RegisterPlaceField
                styles={styles}
                place={place}
                setPlace={setPlace}
                error={errors.place}
                clearError={() => setErrors((e) => ({ ...e, place: undefined }))}
              />

              <EmailVerifyBlock
                mode={mode}
                email={email}
                registrationToken={registrationToken}
                otpSending={otpSending}
                resendSec={resendSec}
                onChangeEmail={(t) => {
                  setEmail(t);
                  setRegistrationToken(null);
                  setRegisterOtp('');
                  setOtpVerifyModalVisible(false);
                  setOtpModalPhase('code');
                  setErrors((e) => ({ ...e, emailVerify: undefined }));
                }}
                onSend={sendRegisterEmailOtp}
              />

              <PremiumField
                label="Total seats"
                requiredStar
                icon="apps-outline"
                value={totalSeats}
                onChangeText={setTotalSeats}
                placeholder="e.g. 100"
                keyboardType="number-pad"
              />

              <PremiumField
                label="Mobile number (optional)"
                icon="call-outline"
                error={errors.mobile}
                value={mobile}
                onChangeText={(t) => {
                  let d = t.replace(/\D/g, '');
                  if (d.startsWith('91') && d.length >= 12) d = d.slice(2);
                  setMobile(d.slice(0, 10));
                  setErrors((e) => ({ ...e, mobile: undefined }));
                }}
                placeholder="10-digit Indian mobile"
                keyboardType="number-pad"
                maxLength={12}
                autoCorrect={false}
              />

              <PremiumField
                label="Password"
                requiredStar
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Strong password"
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                rightSlot={
                  <TouchableOpacity onPress={() => setShowPass((p) => !p)} hitSlop={10}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={stylesVars.icon} />
                  </TouchableOpacity>
                }
              />

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning-outline" size={18} color={theme.colors.warning} />
                  <Text style={styles.apiErrorDetail}>{error}</Text>
                </View>
              )}

              <GradientPrimaryButton
                title="Create library"
                icon="rocket-outline"
                onPress={onSubmit}
                disabled={!canSubmit || loading}
                loading={loading}
                style={styles.primaryGradShadow}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
                style={{ marginTop: 14, alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={styles.backToLogin}>Back to login</Text>
              </TouchableOpacity>
            </View>
      </AuthKeyboardScroll>

        <Modal visible={pickerMode !== null} animationType="slide" transparent onRequestClose={() => setPickerMode(null)}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}
            onPress={() => setPickerMode(null)}
          >
            <Pressable
              style={{
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '75%',
                paddingTop: 10,
                paddingBottom: insets.bottom + 16,
              }}
              onPress={() => {}}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.border,
                  alignSelf: 'center',
                  marginBottom: 12,
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.text }}>
                  {pickerMode === 'state' ? 'Select State / UT' : `Cities in ${selectedState}`}
                </Text>
                <TouchableOpacity onPress={() => setPickerMode(null)} hitSlop={10}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: theme.colors.background,
                  borderWidth: 1.5,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  height: 42,
                  marginHorizontal: 16,
                  marginBottom: 8,
                }}
              >
                <Ionicons name="search-outline" size={15} color="#64748b" />
                <TextInput
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  placeholder={pickerMode === 'state' ? 'Search state…' : 'Search city…'}
                  placeholderTextColor={theme.colors.mutedText}
                  style={{ flex: 1, fontSize: 13, color: theme.colors.text, fontWeight: '500' }}
                  autoFocus
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {pickerSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => setPickerSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={15} color="#64748b" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <FlatList
                data={pickerList}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => (
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />
                )}
                renderItem={({ item }) => {
                  const isSelected = pickerMode === 'state' ? item === selectedState : item === selectedCity;
                  return (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        backgroundColor: isSelected ? 'rgba(13,148,136,0.12)' : 'transparent',
                      }}
                      onPress={() => onPickerSelect(item)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#0f766e' : theme.colors.text,
                        }}
                      >
                        {item}
                      </Text>
                      {isSelected ? <Ionicons name="checkmark" size={16} color="#0f766e" /> : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="search-outline" size={28} color="#64748b" style={{ marginBottom: 6 }} />
                    <Text style={{ fontSize: 13, color: theme.colors.mutedText, fontWeight: '600' }}>
                      {`No results for "${pickerSearch}"`}
                    </Text>
                  </View>
                }
              />
            </Pressable>
          </Pressable>
        </Modal>

      <Modal
        visible={otpVerifyModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeOtpModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={styles.otpModalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeOtpModal}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View style={[styles.otpModalCard, mode === 'dark' && styles.otpModalCardDark]}>
            <View style={styles.otpModalHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.otpModalTitle}>
                  {otpModalPhase === 'done' ? 'All set' : 'Check your inbox'}
                </Text>
                <Text style={styles.otpModalEmail} numberOfLines={1}>
                  {email.trim().toLowerCase()}
                </Text>
              </View>
              {otpModalPhase === 'code' ? (
                <TouchableOpacity onPress={closeOtpModal} hitSlop={12} accessibilityLabel="Close verification">
                  <Ionicons name="close" size={22} color={theme.colors.mutedText} />
                </TouchableOpacity>
              ) : null}
            </View>

            {otpModalPhase === 'code' ? (
              <>
                <Text style={styles.otpModalDesc}>Enter the 6-digit code we emailed you.</Text>
                <OtpSixBoxes
                  value={registerOtp}
                  onChange={(v) => {
                    setRegisterOtp(v);
                    setErrors((e) => ({ ...e, emailVerify: undefined }));
                  }}
                  disabled={otpVerifying}
                  hasError={Boolean(errors.emailVerify)}
                />
                {errors.emailVerify ? <Text style={styles.errorTxt}>{errors.emailVerify}</Text> : null}

                <TouchableOpacity
                  disabled={resendSec > 0 || otpSending}
                  onPress={() => sendRegisterEmailOtp()}
                  style={[
                    styles.otpModalResendRow,
                    (resendSec > 0 || otpSending) && { opacity: 0.48 },
                  ]}
                >
                  <Ionicons name="refresh-outline" size={17} color="#0d9488" />
                  <Text style={styles.otpModalResendTxt}>
                    {otpSending ? 'Sending…' : resendSec > 0 ? `Resend in ${resendSec}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>

                <GradientPrimaryButton
                  title="Verify"
                  icon="shield-checkmark-outline"
                  onPress={verifyRegisterEmailOtp}
                  disabled={registerOtp.replace(/\D/g, '').length !== 6 || otpVerifying}
                  loading={otpVerifying}
                  style={styles.verifyGradShadow}
                />

                <TouchableOpacity onPress={closeOtpModal} style={styles.otpModalChangeEmail}>
                  <Text style={styles.otpModalChangeEmailTxt}>Wrong email? Go back</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.otpModalSuccess}>
                <Ionicons name="checkmark-circle" size={56} color="#059669" />
                <Text
                  style={[
                    styles.otpModalSuccessTitle,
                    mode === 'dark' && { color: '#34d399' },
                  ]}
                >
                  Email verified
                </Text>
                <Text style={styles.otpModalSuccessSub}>Continue below to create your library.</Text>
              </View>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={!!infoModal}
        tone="neutral"
        label="INFO"
        title={infoModal?.title ?? 'Info'}
        description={infoModal?.description}
        showCancel={false}
        confirmText="OK"
        confirmIcon="checkmark-outline"
        onCancel={() => setInfoModal(null)}
        onConfirm={() => setInfoModal(null)}
      />
    </View>
  );
}

const stylesVars = {
  icon: '#94A3B8',
};

function makeStyles() {
  const cardMax = Math.min(SCREEN_WIDTH - 28, 540);
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    hero: {
      paddingHorizontal: 18,
      paddingBottom: 34,
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    heroIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.72)',
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    },
    heroTitle: {
      marginTop: 2,
      fontSize: 22,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -0.6,
    },
    heroSubtitle: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.82)',
      lineHeight: 17,
    },
    scroll: {
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    card: {
      width: '100%',
      maxWidth: cardMax,
      alignSelf: 'center',
      marginTop: -26,
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.09,
      shadowRadius: 28,
      elevation: 14,
    },
    cardDark: {
      backgroundColor: 'rgba(17,24,39,0.94)',
      borderColor: 'rgba(148,163,184,0.18)',
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.colors.text,
      letterSpacing: -0.4,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.mutedText,
      marginBottom: 14,
      lineHeight: 18,
    },
    fieldWrapTight: { marginTop: 8 },
    fieldLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.mutedText,
      letterSpacing: 0.85,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      minHeight: 48,
      backgroundColor: theme.colors.background,
    },
    pickerRowMuted: {
      opacity: 0.52,
    },
    pickerRowError: {
      borderColor: '#f87171',
      backgroundColor: 'rgba(254,226,226,0.35)',
    },
    pickerInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    },
    verifyHint: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.mutedText,
      lineHeight: 17,
    },
    verifiedBanner: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: '#ecfdf5',
      borderWidth: 1,
      borderColor: 'rgba(5,150,105,0.35)',
    },
    verifiedBannerTxt: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
      color: '#065f46',
    },
    verifyGradShadow: {
      marginTop: 12,
      borderRadius: 14,
      shadowColor: '#0f766e',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 8,
      overflow: 'visible',
    },
    primaryGradShadow: {
      marginTop: 18,
      borderRadius: 14,
      shadowColor: '#0f766e',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.32,
      shadowRadius: 20,
      elevation: 10,
      overflow: 'visible',
    },
    errorTxt: {
      fontSize: 11,
      fontWeight: '700',
      color: '#dc2626',
      marginTop: 4,
    },
    backToLogin: {
      color: theme.colors.primary,
      fontWeight: '900',
      fontSize: 14,
    },
    errorBox: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
    },
    apiErrorDetail: {
      flex: 1,
      color: theme.colors.mutedText,
      fontWeight: '700',
      fontSize: 13,
      lineHeight: 18,
    },
    otpModalRoot: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 22,
      paddingVertical: 28,
      backgroundColor: 'rgba(15,23,42,0.55)',
    },
    otpModalCard: {
      borderRadius: 22,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 20,
      backgroundColor: theme.colors.surface,
      maxWidth: 400,
      width: '100%',
      alignSelf: 'center',
      zIndex: 2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.18,
      shadowRadius: 28,
      elevation: 18,
    },
    otpModalCardDark: {
      backgroundColor: 'rgba(17,24,39,0.97)',
      borderColor: 'rgba(148,163,184,0.2)',
    },
    otpModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
    },
    otpModalTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: theme.colors.text,
      letterSpacing: -0.4,
    },
    otpModalEmail: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.mutedText,
    },
    otpModalDesc: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.mutedText,
      lineHeight: 20,
      marginBottom: 16,
    },
    otpModalResendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 14,
      marginBottom: 4,
      paddingVertical: 8,
    },
    otpModalResendTxt: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0d9488',
    },
    otpModalChangeEmail: {
      marginTop: 14,
      alignItems: 'center',
      paddingVertical: 6,
    },
    otpModalChangeEmailTxt: {
      fontSize: 13,
      fontWeight: '800',
      color: '#0d9488',
    },
    otpModalSuccess: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 8,
    },
    otpModalSuccessTitle: {
      marginTop: 14,
      fontSize: 18,
      fontWeight: '900',
      color: '#065f46',
    },
    otpModalSuccessSub: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.mutedText,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
