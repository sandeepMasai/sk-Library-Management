import { apiRaw } from './http';
import { assertBackendKeyMatchesEnv, assertKeyModeAlignment } from './razorpayConfig';

export type RazorpayPaymentResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailedPayload = {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    source?: string;
    step?: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (payload: RazorpayFailedPayload) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

type CreateOrderResponse = {
  ok?: boolean;
  orderId?: string;
  keyId?: string;
  amount?: number;
  currency?: string;
  planId?: string;
  planKey?: string;
  mode?: string;
  message?: string;
  code?: string;
};

function logDebug(label: string, data: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.debug(`[razorpay] ${label}`, data);
  }
}

function formatRazorpayError(msg: string, code?: string): string {
  if (code === 'RAZORPAY_AUTH_FAILED' || code === 'BAD_REQUEST_ERROR' || /authentication failed/i.test(msg)) {
    return (
      'Razorpay authentication failed — backend key/secret pair is wrong or test/live mode is mixed. ' +
      'Set matching RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (same mode: rzp_live_* or rzp_test_*) on the server, redeploy, and restart.'
    );
  }
  return msg;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-razorpay-checkout]');
      if (existing) {
        if (window.Razorpay) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('Failed to load Razorpay checkout.js')),
          { once: true }
        );
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.dataset.razorpayCheckout = 'true';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Razorpay checkout.js'));
      document.body.appendChild(s);
    }),
    15000,
    'Razorpay checkout is taking too long to load. Disable ad blockers and try again.'
  );
}

/** Warm up checkout.js when user opens subscription page. */
export function preloadRazorpayCheckout(): void {
  loadScript().catch(() => {});
}

function parsePaymentFailed(payload: RazorpayFailedPayload): string {
  const e = payload?.error;
  const parts = [e?.description, e?.reason, e?.code].filter(Boolean);
  const msg = parts.join(' — ') || 'Payment failed';
  if (/international card/i.test(msg)) {
    return (
      'International cards are not supported on this Razorpay account. ' +
      'In test mode, pay with UPI: open the UPI tab and use test@razorpay (or card 4111 1111 1111 1111).'
    );
  }
  return formatRazorpayError(msg, e?.code);
}

function buildCheckoutOptions(order: {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Record<string, unknown> {
  return {
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: 'SmartLibDesk',
    description: 'Library subscription',
    order_id: order.orderId,
    prefill: {
      name: order.prefill?.name,
      email: order.prefill?.email,
      contact: order.prefill?.contact,
    },
    theme: { color: '#1E5C52' },
    // Use Razorpay default checkout — UPI (GPay, PhonePe), cards, netbanking, wallets, etc.
  };
}

export type RazorpayCheckoutHooks = {
  /** Fired after Railway/create-order succeeds, before Razorpay script opens. */
  onOrderReady?: () => void;
  /** Fired immediately after Razorpay modal opens — hide your own overlays here. */
  onCheckoutOpen?: () => void;
  /** Fired after user pays in Razorpay, before server verify. */
  onVerifyStart?: () => void;
};

export async function openRazorpayCheckout(
  planId: string,
  prefill?: { name?: string; email?: string; contact?: string },
  hooks?: RazorpayCheckoutHooks
): Promise<RazorpayPaymentResult> {
  const raw = await withTimeout(
    apiRaw<CreateOrderResponse>('/api/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
    25000,
    'Creating payment order timed out. Railway may be slow — wait a moment and try again.'
  );

  logDebug('create-order response', {
    orderId: raw.orderId,
    keyId: raw.keyId,
    amount: raw.amount,
    currency: raw.currency,
    mode: raw.mode,
    code: raw.code,
  });

  if (!raw.orderId || !raw.keyId || raw.amount == null) {
    const msg = raw.message || 'Could not create Razorpay order';
    throw new Error(formatRazorpayError(msg, raw.code));
  }

  assertBackendKeyMatchesEnv(raw.keyId);
  assertKeyModeAlignment(raw.keyId);

  hooks?.onOrderReady?.();

  const order = {
    orderId: raw.orderId,
    keyId: raw.keyId,
    amount: Number(raw.amount),
    currency: raw.currency || 'INR',
    planId: raw.planId || planId,
  };

  if (!Number.isFinite(order.amount) || order.amount < 100) {
    throw new Error('Invalid order amount from server (must be at least 100 paise).');
  }

  await loadScript();
  if (!window.Razorpay) throw new Error('Razorpay checkout script did not load');

  logDebug('opening checkout', {
    key: order.keyId,
    order_id: order.orderId,
    amount: order.amount,
    currency: order.currency,
  });

  const payment = await new Promise<RazorpayPaymentResult>((resolve, reject) => {
    const checkoutOpts = buildCheckoutOptions({
      keyId: order.keyId,
      amount: order.amount,
      currency: order.currency,
      orderId: order.orderId,
      prefill,
    });

    const rzp = new window.Razorpay!({
      ...checkoutOpts,
      handler: (response: RazorpayPaymentResult) => {
        logDebug('payment success handler', {
          order_id: response.razorpay_order_id,
          payment_id: response.razorpay_payment_id,
        });
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          logDebug('checkout dismissed', {});
          reject(new Error('Payment cancelled'));
        },
      },
    });

    rzp.on('payment.failed', (payload: RazorpayFailedPayload) => {
      logDebug('payment.failed', payload as Record<string, unknown>);
      reject(new Error(parsePaymentFailed(payload)));
    });

    rzp.open();
    hooks?.onCheckoutOpen?.();
  });

  hooks?.onVerifyStart?.();

  try {
    const verifyBody = await withTimeout(
      apiRaw<{ ok?: boolean; code?: string; message?: string }>('/api/payment/verify', {
        method: 'POST',
        body: JSON.stringify({
          planId: order.planId,
          orderId: payment.razorpay_order_id,
          paymentId: payment.razorpay_payment_id,
          signature: payment.razorpay_signature,
        }),
      }),
      30000,
      'Payment verification timed out. If money was debited, wait 2 minutes and refresh this page.'
    );
    if (verifyBody?.code === 'PAYMENT_PENDING') {
      throw new Error(verifyBody.message || 'Payment is still processing');
    }
    logDebug('verify success', { orderId: payment.razorpay_order_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment verification failed';
    if (/PAYMENT_PENDING|still processing|unprocessed/i.test(msg)) {
      throw new Error(
        'Payment is still processing (Razorpay status: unprocessed/pending). ' +
          'In test mode, do not scan the QR with a real UPI app — type test@razorpay in the UPI field instead. ' +
          'If money was debited, wait 2 minutes and try Pay now again, or check Razorpay Dashboard → Transactions.'
      );
    }
    throw new Error(
      msg.includes('verification') || msg.includes('VERIFY')
        ? msg
        : `Payment received but verification failed: ${msg}. Contact support with payment id ${payment.razorpay_payment_id}.`
    );
  }

  return payment;
}
