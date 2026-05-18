import { NativeModules, Platform } from 'react-native';

export type RazorpayCheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
};

export type RazorpayPaymentResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type WebHost = (options: RazorpayCheckoutOptions) => Promise<RazorpayPaymentResult>;

let webHost: WebHost | null = null;

export function registerRazorpayWebHost(host: WebHost) {
  webHost = host;
  return () => {
    if (webHost === host) webHost = null;
  };
}

function getNativeRazorpay(): { open: (opts: RazorpayCheckoutOptions) => Promise<RazorpayPaymentResult> } | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-razorpay');
    const checkout = mod?.default ?? mod;
    if (!checkout || typeof checkout.open !== 'function') return null;
    const bridge =
      NativeModules.RazorpayCheckout ??
      NativeModules.RNRazorpayCheckout ??
      NativeModules.RazorpayModule;
    if (!bridge) return null;
    return checkout;
  } catch {
    return null;
  }
}

export function isNativeRazorpayLinked(): boolean {
  return getNativeRazorpay() != null;
}

export function isPaymentSetupError(message: string | null | undefined): boolean {
  const m = String(message || '').toLowerCase();
  if (!m) return false;
  return (
    (m.includes('cannot read property') && m.includes('open')) ||
    m.includes("'open' of null") ||
    m.includes('razorpay not available') ||
    m.includes('native module') ||
    m.includes('module is not linked') ||
    m.includes('payment unavailable')
  );
}

function normalizePaymentError(e: unknown): Error {
  if (e instanceof Error) return e;
  const any = e as { description?: string; message?: string };
  const msg = String(any?.description || any?.message || 'Payment failed');
  if (isPaymentSetupError(msg)) {
    return new Error('Payment checkout could not be opened on this device.');
  }
  return new Error(msg);
}

async function openRazorpayWebCheckout(options: RazorpayCheckoutOptions): Promise<RazorpayPaymentResult> {
  if (!webHost) {
    throw new Error(
      'Payment checkout is not ready. Restart the app. For native Razorpay, run: npx expo run:android'
    );
  }
  return webHost(options);
}

/**
 * Opens Razorpay checkout — native SDK when linked, otherwise in-app WebView (works in Expo Go).
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<RazorpayPaymentResult> {
  const native = getNativeRazorpay();
  if (native) {
    try {
      return await native.open(options);
    } catch (e) {
      const msg = String((e as { message?: string })?.message || '');
      if (!isPaymentSetupError(msg)) throw normalizePaymentError(e);
      // Native bridge broken — fall through to WebView.
    }
  }
  return openRazorpayWebCheckout(options);
}

export function buildRazorpayCheckoutHtml(options: RazorpayCheckoutOptions): string {
  const esc = (v: string) =>
    v
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/</g, '\\u003c')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '');

  const key = esc(options.key);
  const orderId = esc(options.order_id);
  const amount = Number(options.amount) || 0;
  const currency = esc(options.currency || 'INR');
  const name = esc(options.name || 'Library');
  const description = esc(options.description || 'Subscription');
  const prefillName = esc(options.prefill?.name || '');
  const prefillEmail = esc(options.prefill?.email || '');
  const prefillContact = esc(options.prefill?.contact || '');
  const color = esc(options.theme?.color || '#0F766E');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; margin: 0; padding: 24px; }
    .box { max-width: 420px; margin: 40px auto; text-align: center; color: #334155; }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .sub { font-size: 14px; color: #64748b; }
  </style>
</head>
<body>
  <div class="box">
    <div class="title">Opening secure payment…</div>
    <div class="sub">Complete payment in the Razorpay window.</div>
  </div>
  <script>
    function send(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    try {
      var options = {
        key: '${key}',
        order_id: '${orderId}',
        amount: ${amount},
        currency: '${currency}',
        name: '${name}',
        description: '${description}',
        prefill: { name: '${prefillName}', email: '${prefillEmail}', contact: '${prefillContact}' },
        theme: { color: '${color}' },
        handler: function (response) {
          send({
            type: 'success',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        modal: {
          ondismiss: function () { send({ type: 'dismiss', message: 'Payment cancelled' }); }
        }
      };
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        var msg = (resp && resp.error && resp.error.description) ? resp.error.description : 'Payment failed';
        send({ type: 'failed', message: msg });
      });
      rzp.open();
    } catch (err) {
      send({ type: 'failed', message: (err && err.message) ? err.message : 'Could not start checkout' });
    }
  </script>
</body>
</html>`;
}
