import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { apiPost, type ApiError } from '../../services/api';
import { theme } from '../../theme';
import { useAppStore, type User } from '../../store';
import { useTheme } from '../../theme/ThemeProvider';
import { ConfirmModal } from '../../components/ConfirmModal';
import { INDIA_STATE_CITIES, ALL_STATES } from './indiaRegisterLocations';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ state?: string; city?: string; pincode?: string; place?: string; mobile?: string }>({});
  const [infoModal, setInfoModal] = useState<{ title: string; description?: string } | null>(null);

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

  const canSubmit = useMemo(() => {
    return Boolean(
      libraryName.trim() &&
        ownerName.trim() &&
        selectedState &&
        selectedCity &&
        /^\d{6}$/.test(pincode.replace(/\D/g, '')) &&
        place.trim() &&
        totalSeats.trim() &&
        email.trim() &&
        /^\d{10}$/.test(normalizeRegisterMobileDigits(mobile)) &&
        password.trim()
    );
  }, [libraryName, ownerName, selectedState, selectedCity, pincode, place, totalSeats, email, mobile, password]);

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
    const nextErrors: { state?: string; city?: string; pincode?: string; place?: string; mobile?: string } = {};
    if (!selectedState) nextErrors.state = 'Please select a state';
    if (!selectedCity) nextErrors.city = 'Please select a city';
    const pinDigits = pincode.replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(pinDigits)) nextErrors.pincode = 'Enter a valid 6-digit PIN code';
    if (!place.trim()) nextErrors.place = 'Please enter area or place';
    if (!/^\d{10}$/.test(normalizeRegisterMobileDigits(mobile))) {
      nextErrors.mobile = 'Enter a valid 10-digit mobile number';
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
      const response = await apiPost<
        RegisterLibraryResponse | { success: boolean; data: RegisterLibraryResponse; message?: string }
      >(`/api/auth/register-library`, {
        libraryName: libraryName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        city: selectedCity,
        state: selectedState,
        pincode: pincode.replace(/\D/g, '').slice(0, 6),
        place: place.trim(),
        phone: normalizeRegisterMobileDigits(mobile),
      });
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
        colors={['#0F766E', '#0D9488', '#14B8A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.secureLabel}>CREATE LIBRARY</Text>
        <Text style={styles.brandName}>Register</Text>
        <Text style={styles.brandTagline}>Start your library workspace in minutes.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Library details</Text>

              <Field
                label="LIBRARY NAME"
                icon="business-outline"
                value={libraryName}
                onChangeText={setLibraryName}
                placeholder="e.g. PRITAN Library"
              />
              <Field
                label="OWNER NAME"
                icon="person-outline"
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="e.g. Sandeep"
              />

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  STATE <Text style={{ color: '#e24b4a' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.fieldRow, !!errors.state && styles.fieldRowError]}
                  onPress={() => openPicker('state')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="map-outline" size={16} color={selectedState ? '#0f766e' : '#64748b'} />
                  <Text style={[styles.input, !selectedState && { color: theme.colors.mutedText }]}>
                    {selectedState || 'Select state'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#64748b" />
                </TouchableOpacity>
                {errors.state ? <Text style={styles.errorTxt}>{errors.state}</Text> : null}
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  CITY <Text style={{ color: '#e24b4a' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.fieldRow, !selectedState && { opacity: 0.5 }, !!errors.city && styles.fieldRowError]}
                  onPress={() => selectedState && openPicker('city')}
                  activeOpacity={0.85}
                  disabled={!selectedState}
                >
                  <Ionicons name="location-outline" size={16} color={selectedCity ? '#0f766e' : '#64748b'} />
                  <Text style={[styles.input, !selectedCity && { color: theme.colors.mutedText }]}>
                    {selectedCity || (selectedState ? 'Select city' : 'Select state first')}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#64748b" />
                </TouchableOpacity>
                {errors.city ? <Text style={styles.errorTxt}>{errors.city}</Text> : null}
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  CITY PIN CODE <Text style={{ color: '#e24b4a' }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.fieldRow,
                    !selectedCity && { opacity: 0.5 },
                    !!errors.pincode && styles.fieldRowError,
                  ]}
                >
                  <Ionicons name="keypad-outline" size={18} color={stylesVars.icon} />
                  <TextInput
                    value={pincode}
                    onChangeText={(t) => {
                      setPincode(t.replace(/\D/g, '').slice(0, 6));
                      setErrors((e) => ({ ...e, pincode: undefined }));
                    }}
                    placeholder={selectedCity ? '6-digit PIN' : 'Select city first'}
                    placeholderTextColor={theme.colors.mutedText}
                    style={[styles.input, { flex: 1 }]}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!!selectedCity}
                    autoCorrect={false}
                  />
                </View>
                {errors.pincode ? <Text style={styles.errorTxt}>{errors.pincode}</Text> : null}
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  PLACE / AREA <Text style={{ color: '#e24b4a' }}>*</Text>
                </Text>
                <View style={[styles.fieldRow, !!errors.place && styles.fieldRowError]}>
                  <Ionicons name="navigate-outline" size={18} color={stylesVars.icon} />
                  <TextInput
                    value={place}
                    onChangeText={(t) => {
                      setPlace(t);
                      setErrors((e) => ({ ...e, place: undefined }));
                    }}
                    placeholder="e.g. Sector 22, near metro, landmark"
                    placeholderTextColor={theme.colors.mutedText}
                    style={[styles.input, { flex: 1 }]}
                    autoCorrect={false}
                    autoCapitalize="sentences"
                    returnKeyType="next"
                    maxLength={200}
                  />
                </View>
                {errors.place ? <Text style={styles.errorTxt}>{errors.place}</Text> : null}
              </View>

              <Field
                label="TOTAL SEATS"
                icon="apps-outline"
                value={totalSeats}
                onChangeText={setTotalSeats}
                placeholder="e.g. 100"
                keyboardType="number-pad"
              />
              <Field
                label="EMAIL"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="owner@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  MOBILE NUMBER <Text style={{ color: '#e24b4a' }}>*</Text>
                </Text>
                <View style={[styles.fieldRow, !!errors.mobile && styles.fieldRowError]}>
                  <Ionicons name="call-outline" size={18} color={stylesVars.icon} />
                  <TextInput
                    value={mobile}
                    onChangeText={(t) => {
                      let d = t.replace(/\D/g, '');
                      if (d.startsWith('91') && d.length >= 12) d = d.slice(2);
                      setMobile(d.slice(0, 10));
                      setErrors((e) => ({ ...e, mobile: undefined }));
                    }}
                    placeholder="10-digit mobile (e.g. 9876543210)"
                    placeholderTextColor={theme.colors.mutedText}
                    style={[styles.input, { flex: 1 }]}
                    keyboardType="number-pad"
                    maxLength={12}
                    autoCorrect={false}
                  />
                </View>
                {errors.mobile ? <Text style={styles.errorTxt}>{errors.mobile}</Text> : null}
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={stylesVars.icon} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a strong password"
                    placeholderTextColor={theme.colors.mutedText}
                    style={[styles.input, { flex: 1 }]}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={onSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowPass((p) => !p)} hitSlop={8}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={stylesVars.icon} />
                  </TouchableOpacity>
                </View>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
                  <Text style={styles.apiErrorDetail}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={onSubmit}
                activeOpacity={0.9}
                style={[styles.loginBtn, !canSubmit && { opacity: 0.6 }]}
                disabled={!canSubmit || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnTxt}>Create Library</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
                style={{ marginTop: 14, alignItems: 'center' }}
              >
                <Text style={styles.backToLogin}>Back to login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

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
      </KeyboardAvoidingView>

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

function Field(props: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  const { mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(), [mode]);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <View style={styles.fieldRow}>
        <Ionicons name={props.icon} size={18} color={stylesVars.icon} />
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.mutedText}
          style={styles.input}
          autoCorrect={false}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize}
        />
      </View>
    </View>
  );
}

const stylesVars = {
  icon: '#94A3B8',
};

function makeStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    hero: {
      height: 220,
      paddingHorizontal: 18,
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
      justifyContent: 'flex-end',
      paddingBottom: 18,
    },
    secureLabel: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: 'rgba(255,255,255,0.75)',
    },
    brandName: { marginTop: 8, fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
    brandTagline: { marginTop: 6, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
    scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, marginBottom: 12 },
    fieldWrap: { marginTop: 10 },
    fieldLabel: { fontSize: 11, fontWeight: '900', color: theme.colors.mutedText, letterSpacing: 1.1, marginBottom: 8 },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
    },
    fieldRowError: {
      borderColor: '#e24b4a',
      backgroundColor: '#fff5f5',
    },
    errorTxt: {
      fontSize: 10,
      fontWeight: '700',
      color: '#e24b4a',
      marginTop: 3,
    },
    input: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
    loginBtn: {
      marginTop: 16,
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    loginBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
    backToLogin: { color: theme.colors.primary, fontWeight: '900' },
    errorBox: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
    },
    apiErrorDetail: { flex: 1, color: theme.colors.mutedText, fontWeight: '800', fontSize: 12 },
  });
}
