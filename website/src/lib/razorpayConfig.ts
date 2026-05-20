/**
 * Public Razorpay key id only (safe for frontend).
 * Must match backend RAZORPAY_KEY_ID and the keyId returned from POST /api/payment/create-order.
 */
export const EXPECTED_RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID?.trim().replace(/\/$/, '') || '';

/** Website stays on Razorpay TEST/sandbox only (no live checkout). Set false to allow live. */
export const RAZORPAY_TEST_ONLY =
  String(import.meta.env.VITE_RAZORPAY_TEST_ONLY ?? 'true').trim().toLowerCase() !== 'false';

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

/** Website policy: sandbox only — block live keys from backend. */
export function assertWebsiteTestModeOnly(backendKeyId: string): void {
  if (!RAZORPAY_TEST_ONLY) return;
  if (razorpayKeyMode(backendKeyId) === 'live') {
    throw new Error(
      'This website uses Razorpay TEST mode only. On Railway set RAZORPAY_KEY_ID=rzp_test_* (not rzp_live_*), then redeploy the backend.'
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
