import { apiRaw } from './http';

export type RazorpayPaymentResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, cb: (r: RazorpayPaymentResult) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(s);
  });
}

export async function openRazorpayCheckout(planId: string, prefill?: { name?: string; email?: string }) {
  const raw = await apiRaw<{
    ok?: boolean;
    orderId?: string;
    keyId?: string;
    amount?: number;
    currency?: string;
    planId?: string;
    message?: string;
  }>('/api/payment/create-order', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });

  if (!raw.orderId || !raw.keyId || raw.amount == null) {
    throw new Error(raw.message || 'Could not create Razorpay order');
  }

  const order = {
    orderId: raw.orderId,
    keyId: raw.keyId,
    amount: raw.amount,
    currency: raw.currency || 'INR',
    planId: raw.planId || planId,
  };

  await loadScript();
  if (!window.Razorpay) throw new Error('Razorpay not available');

  return new Promise<RazorpayPaymentResult>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'SmartLibDesk',
      description: 'Library subscription',
      order_id: order.orderId,
      prefill: { name: prefill?.name, email: prefill?.email },
      theme: { color: '#1E5C52' },
      handler: (response: RazorpayPaymentResult) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.on('payment.failed', () => reject(new Error('Payment failed')));
    rzp.open();
  }).then(async (payment) => {
    await apiRaw('/api/payment/verify', {
      method: 'POST',
      body: JSON.stringify({
        planId: order.planId,
        orderId: payment.razorpay_order_id,
        paymentId: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      }),
    });
    return payment;
  });
}
