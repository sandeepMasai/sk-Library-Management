import type { AxiosError } from 'axios';
import { resolveApiBaseUrl } from '../constants/apiUrl';

export function isNetworkFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const ax = err as AxiosError;
  if (ax.code === 'ERR_NETWORK' || ax.code === 'ECONNABORTED') return true;
  const msg = String(ax.message || '');
  return /network error|timeout|econnrefused|enotfound|failed to connect/i.test(msg);
}

/** User-facing message when the device cannot reach the API (not wrong password). */
export function formatReachabilityError(err?: unknown): string {
  const base = resolveApiBaseUrl();
  if (isNetworkFailure(err)) {
    if (/localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i.test(base)) {
      return `Can't reach the app server at ${base}. Use the same Wi‑Fi as your Mac, run "npm run start:lan", then reload the app.`;
    }
    return `Can't reach the server. Check mobile data/Wi‑Fi and try again.`;
  }
  const msg =
    (err as { message?: string })?.message ||
    (err as AxiosError)?.response?.data?.message ||
    'Request failed';
  return String(msg);
}
