import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, type ApiError } from './api';

export type GlobalSettings = {
  privacyPolicyUrl: string;
  termsUrl: string;
  refundPolicyUrl: string;
  communication: { whatsapp: string; channel: string; email: string };
  updatedAt: string | null;
};

type GlobalSettingsDto = {
  ok?: boolean;
  success?: boolean;
  settings?: GlobalSettings;
  data?: GlobalSettings;
};

/** Normalize GET/PUT payloads: public GET uses `{ ok, settings }`, admin PUT uses `{ success, data }`. */
export function parseGlobalSettingsPayload(body: unknown): GlobalSettings {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid settings response');
  }
  const b = body as GlobalSettingsDto & GlobalSettings;
  const raw = b.settings ?? b.data ?? (b.privacyPolicyUrl !== undefined ? b : null);
  if (!raw || typeof raw !== 'object') {
    throw new Error('Settings payload missing');
  }
  return {
    privacyPolicyUrl: String(raw.privacyPolicyUrl || '').trim(),
    termsUrl: String(raw.termsUrl || '').trim(),
    refundPolicyUrl: String(raw.refundPolicyUrl || '').trim(),
    communication: {
      whatsapp: String(raw.communication?.whatsapp || '').trim(),
      channel: String(raw.communication?.channel || '').trim(),
      email: String(raw.communication?.email || '').trim(),
    },
    updatedAt: raw.updatedAt ?? null,
  };
}

const STORAGE_KEY = 'global_settings_v1';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

let mem:
  | {
      settings: GlobalSettings;
      fetchedAt: number;
    }
  | null = null;

export async function getGlobalSettings(opts?: { force?: boolean }): Promise<GlobalSettings> {
  const force = Boolean(opts?.force);
  const now = Date.now();

  if (!force && mem && now - mem.fetchedAt < TTL_MS) return mem.settings;

  if (!force && !mem) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { settings: GlobalSettings; fetchedAt: number };
        if (cached?.settings && typeof cached.fetchedAt === 'number' && now - cached.fetchedAt < TTL_MS) {
          mem = cached;
          return cached.settings;
        }
      }
    } catch {
      // ignore cache read errors
    }
  }

  const data = await apiGet<GlobalSettingsDto>('/api/settings');
  const settings = parseGlobalSettingsPayload(data);

  mem = { settings, fetchedAt: now };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch {
    // ignore cache write errors
  }
  return settings;
}

export function isValidHttpUrl(input: string) {
  try {
    const u = new URL(String(input || '').trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function toApiErrorMessage(e: unknown) {
  const err = e as ApiError;
  return err?.message || 'Request failed';
}

/** Call after admin saves global settings so library/student screens fetch fresh email & URLs. */
export async function clearGlobalSettingsCache() {
  mem = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function formatSettingsUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

