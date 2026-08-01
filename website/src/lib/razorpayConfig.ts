/**
 * Public Razorpay key id only (safe for frontend).
 * Optional consistency check for the keyId returned from POST /api/payment/create-order.
 * The authenticated backend is the source of truth for checkout credentials.
 */
export const EXPECTED_RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID?.trim().replace(/\/$/, '') || '';

/** Optional sandbox lock. By default, the website accepts the mode returned by the backend. */
export const RAZORPAY_TEST_ONLY =
  String(import.meta.env.VITE_RAZORPAY_TEST_ONLY ?? 'false').trim().toLowerCase() === 'true';

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
        '[razorpay] VITE_RAZORPAY_KEY_ID is unset — using the keyId returned by the authenticated backend.'
      );
    }
    return;
  }

  if (backendKeyId !== EXPECTED_RAZORPAY_KEY_ID) {
    if (!RAZORPAY_TEST_ONLY && razorpayKeyMode(backendKeyId) === 'live') {
      if (import.meta.env.DEV) {
        console.warn(
          `[razorpay] VITE_RAZORPAY_KEY_ID (${EXPECTED_RAZORPAY_KEY_ID}) differs from backend (${backendKeyId}). Using backend key for checkout.`
        );
      }
      return;
    }
    throw new Error(
      `Razorpay key mismatch: backend returned "${backendKeyId}" but VITE_RAZORPAY_KEY_ID is "${EXPECTED_RAZORPAY_KEY_ID}". ` +
        'Use the same key id on Railway (RAZORPAY_KEY_ID) and Vercel/website (VITE_RAZORPAY_KEY_ID), then redeploy both.'
    );
  }
}

/** Optional website policy: when explicitly enabled, block live keys from backend. */
export function assertWebsiteTestModeOnly(backendKeyId: string): void {
  if (!RAZORPAY_TEST_ONLY) return;
  if (razorpayKeyMode(backendKeyId) === 'live') {
    throw new Error(
      'Razorpay mode conflict: the backend uses a LIVE key (rzp_live_*), but this website build explicitly has VITE_RAZORPAY_TEST_ONLY=true. ' +
        'Remove that variable or set it to false, then rebuild and redeploy the website. The backend Razorpay key is used for checkout.'
    );
  }
}

/** Ensure test/live mode is consistent between frontend env and backend order. */
export function assertKeyModeAlignment(backendKeyId: string): void {
  assertWebsiteTestModeOnly(backendKeyId);

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
        'Both must be rzp_test_* while the website is in test-only mode.'
    );
  }

  if (RAZORPAY_TEST_ONLY && envMode && envMode !== 'test') {
    throw new Error('VITE_RAZORPAY_KEY_ID must be rzp_test_* — this website is configured for test mode only.');
  }
}
