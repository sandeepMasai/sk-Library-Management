import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../../theme';
import {
  buildRazorpayCheckoutHtml,
  registerRazorpayWebHost,
  type RazorpayCheckoutOptions,
  type RazorpayPaymentResult,
} from '../../services/razorpayCheckout';

type Session = {
  options: RazorpayCheckoutOptions;
  resolve: (value: RazorpayPaymentResult) => void;
  reject: (reason?: unknown) => void;
};

export default function RazorpayWebCheckoutHost() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    return registerRazorpayWebHost((options) => {
      return new Promise<RazorpayPaymentResult>((resolve, reject) => {
        setSession({ options, resolve, reject });
      });
    });
  }, []);

  const close = (rejectReason?: string) => {
    if (!session) return;
    session.reject(new Error(rejectReason || 'Payment cancelled'));
    setSession(null);
  };

  const finish = (result: RazorpayPaymentResult) => {
    if (!session) return;
    session.resolve(result);
    setSession(null);
  };

  return (
    <Modal visible={Boolean(session)} animationType="slide" onRequestClose={() => close()}>
      {session ? (
        <View style={styles.root}>
          <View style={styles.bar}>
            <Text style={styles.barTitle}>Complete payment</Text>
            <TouchableOpacity onPress={() => close()} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <WebView
            style={styles.web}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.colors.primary as string} />
                <Text style={styles.loadingTxt}>Loading Razorpay…</Text>
              </View>
            )}
            source={{ html: buildRazorpayCheckoutHtml(session.options) }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data) as {
                  type?: string;
                  message?: string;
                  razorpay_payment_id?: string;
                  razorpay_order_id?: string;
                  razorpay_signature?: string;
                };
                if (data.type === 'success' && data.razorpay_payment_id && data.razorpay_order_id && data.razorpay_signature) {
                  finish({
                    razorpay_payment_id: data.razorpay_payment_id,
                    razorpay_order_id: data.razorpay_order_id,
                    razorpay_signature: data.razorpay_signature,
                  });
                  return;
                }
                if (data.type === 'dismiss') {
                  close(data.message || 'Payment cancelled');
                  return;
                }
                if (data.type === 'failed') {
                  close(data.message || 'Payment failed');
                }
              } catch {
                close('Invalid payment response');
              }
            }}
          />
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  bar: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  barTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  cancel: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  web: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingTxt: { color: theme.colors.mutedText, fontWeight: '600' },
});
