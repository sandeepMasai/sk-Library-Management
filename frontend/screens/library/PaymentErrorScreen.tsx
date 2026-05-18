import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme';
import { type ApiError } from '../../services/api';
import { isPaymentSetupError } from '../../services/razorpayCheckout';
import { isSubscriptionActive, syncSubscriptionMe } from '../../services/subscriptionSync';

type Params = {
  message?: string;
  retryTo?: string;
  skipVerify?: boolean;
};

const VERIFY_ATTEMPTS = 4;
const VERIFY_DELAY_MS = 5000;

export default function PaymentErrorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route?.params || {}) as Params;
  const message = (params?.message || '').trim();
  const retryTo = String(params?.retryTo || '').trim() || 'PlanSelection';
  const skipVerify = Boolean(params?.skipVerify) || isPaymentSetupError(message);

  const [checking, setChecking] = useState(!skipVerify);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const checkStatus = useCallback(async () => {
    setCheckError(null);
    try {
      const me = await syncSubscriptionMe({ force: true });
      if (isSubscriptionActive(me.user)) {
        navigation.replace('PaymentSuccess');
        return { active: true };
      }
      return { active: false };
    } catch (e: unknown) {
      const err = e as ApiError;
      setCheckError(err?.message || 'Could not refresh payment status');
      return { active: false };
    }
  }, [navigation]);

  const pollVerify = useCallback(async () => {
    for (let i = 1; i <= VERIFY_ATTEMPTS; i++) {
      if (!mountedRef.current) return { active: false };
      setAttempt(i);
      const res = await checkStatus();
      if (res.active) return { active: true };
      if (i < VERIFY_ATTEMPTS) await sleep(VERIFY_DELAY_MS);
    }
    return { active: false };
  }, [checkStatus]);

  useEffect(() => {
    if (skipVerify) return;
    (async () => {
      setChecking(true);
      await pollVerify();
      if (mountedRef.current) setChecking(false);
    })();
  }, [pollVerify, skipVerify]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => checking);
    return () => sub.remove();
  }, [checking]);

  const displayMessage = useMemo(() => {
    if (isPaymentSetupError(message)) {
      return 'Payment window could not open. Go back and tap Pay again — Razorpay will open in a secure in-app browser.';
    }
    if (checking) return `Please wait… Verifying payment (${attempt}/${VERIFY_ATTEMPTS})`;
    if (checkError) return checkError;
    return message || 'Payment verification is taking longer than usual. Please tap Retry.';
  }, [checking, checkError, message, attempt]);

  const title = skipVerify ? 'Payment could not start' : checking ? 'Please wait…' : 'Still verifying…';
  const iconName = checking && !skipVerify ? 'time-outline' : 'information-circle';
  const iconColor = theme.colors.primary;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.root}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconName as any} size={64} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{displayMessage}</Text>
        {checking && !skipVerify ? (
          <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary as any} />
        ) : null}

        {!checking ? (
          <View style={styles.row}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.goBack()} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryTxt}>Go Back</Text>
            </TouchableOpacity>
            {!skipVerify ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={async () => {
                  if (retrying) return;
                  setRetrying(true);
                  setChecking(true);
                  const res = await pollVerify();
                  setChecking(false);
                  if (res.active) {
                    setRetrying(false);
                    return;
                  }
                  navigation.replace(retryTo);
                  setRetrying(false);
                }}
                style={styles.btnPrimary}
                disabled={checking || retrying}
              >
                <Text style={styles.btnPrimaryTxt}>{retrying ? 'Please wait…' : 'Retry'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.replace(retryTo)}
                style={styles.btnPrimary}
              >
                <Text style={styles.btnPrimaryTxt}>Try again</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  root: { flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center' },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: theme.colors.text, fontWeight: '900', fontSize: 20 },
  sub: { marginTop: 6, color: theme.colors.mutedText, fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btnSecondary: {
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryTxt: { color: theme.colors.text, fontWeight: '900' },
  btnPrimary: {
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryTxt: { color: theme.colors.surface, fontWeight: '900' },
});
