import { apiGet } from './api';

const MIN_SYNC_INTERVAL_MS = Number(
  process.env.EXPO_PUBLIC_SUBSCRIPTION_SYNC_MS || 60_000
);

type SubscriptionMeResponse = { ok: boolean; user?: Record<string, unknown> };

let inflight: Promise<SubscriptionMeResponse | null> | null = null;
let lastSyncAt = 0;
let lastUser: Record<string, unknown> | null = null;

function applyUserToStore(user: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAppStore } = require('../store');
  useAppStore.setState({ currentUser: user as never });
}

/**
 * Throttled GET /api/subscription/me — dedupes parallel calls and enforces min interval.
 */
export async function syncSubscriptionMe(options?: {
  force?: boolean;
}): Promise<{ ok: boolean; user?: Record<string, unknown>; cached?: boolean }> {
  const force = Boolean(options?.force);
  const now = Date.now();

  if (!force && lastUser && now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return { ok: true, user: lastUser, cached: true };
  }

  if (inflight) {
    const res = await inflight;
    return { ok: Boolean(res?.ok), user: res?.user ?? lastUser ?? undefined, cached: true };
  }

  inflight = (async () => {
    try {
      const me = await apiGet<SubscriptionMeResponse>('/api/subscription/me');
      if (me?.user) {
        lastUser = me.user;
        lastSyncAt = Date.now();
        applyUserToStore(me.user);
      }
      return me;
    } finally {
      inflight = null;
    }
  })();

  const me = await inflight;
  return { ok: Boolean(me?.ok), user: me?.user ?? lastUser ?? undefined, cached: false };
}

/** Call after login / payment verify when server already returned fresh user. */
export function seedSubscriptionUser(user: Record<string, unknown> | null | undefined) {
  if (!user) return;
  lastUser = user;
  lastSyncAt = Date.now();
}

export function isSubscriptionActive(user: Record<string, unknown> | null | undefined): boolean {
  const u = user || lastUser;
  if (!u) return false;
  const exp = u.planExpiryDate ? new Date(String(u.planExpiryDate)).getTime() : null;
  return (
    String(u.subscriptionStatus || '') === 'active' &&
    (exp == null || (Number.isFinite(exp) && Date.now() < exp))
  );
}
