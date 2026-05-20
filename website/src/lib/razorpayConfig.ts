/**
 * Public Razorpay key id only (safe for frontend).
 * Must match backend RAZORPAY_KEY_ID and the keyId returned from POST /api/payment/create-order.
 */
export const EXPECTED_RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID?.trim().replace(/\/$/, '') || '';

export function razorpayKeyMode(keyId: string): 'test' | 'live' | 'unknown' {
  if (keyId.startsWith('rzp_test_')) return 'test';
  if (keyId.startsWith('rzp_live_')) return 'live';
  return 'unknown';
}

/** Throws if frontend .env key does not match backend order response (common cause of "Authentication failed"). */
export function assertBackendKeyMatchesEnv(backendKeyId: string): void {
  if (!EXPECTED_RAZORPAY_KEY_ID) {
    if (import.meta.env.DEV) {
      console.warn(
        '[razorpay] VITE_RAZORPAY_KEY_ID is unset — skipping key match check. Set it to your rzp_live_* or rzp_test_* id in website/.env'
      );
    }
    return;
  }

  if (backendKeyId !== EXPECTED_RAZORPAY_KEY_ID) {
    throw new Error(
      `Razorpay key mismatch: backend returned "${backendKeyId}" but VITE_RAZORPAY_KEY_ID is "${EXPECTED_RAZORPAY_KEY_ID}". ` +
        'Use the same key id on Railway (RAZORPAY_KEY_ID) and Vercel/website (VITE_RAZORPAY_KEY_ID), then redeploy both.'
    );
  }
}

/** Ensure test/live mode is consistent between frontend env and backend order. */
export function assertKeyModeAlignment(backendKeyId: string): void {
  const backendMode = razorpayKeyMode(backendKeyId);
  const envMode = EXPECTED_RAZORPAY_KEY_ID ? razorpayKeyMode(EXPECTED_RAZORPAY_KEY_ID) : null;

  if (
    envMode &&
    backendMode !== 'unknown' &&
    envMode !== 'unknown' &&
    envMode !== backendMode
  ) {
    throw new Error(
      `Razorpay mode mismatch: backend uses ${backendMode} (${backendKeyId}) but VITE_RAZORPAY_KEY_ID is ${envMode}. ` +
        'Both must be rzp_live_* (production) or both rzp_test_* (sandbox).'
    );
  }

  if (backendMode === 'live' && import.meta.env.DEV) {
    console.warn('[razorpay] LIVE key in dev — real money will be charged.');
  }
}
