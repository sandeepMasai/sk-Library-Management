import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { apiGet, type ApiError } from './api';

export type LibraryCommunication = {
  whatsapp: string;
  channel: string;
  email: string;
  phone: string;
  whatsappGroup: string;
};

export type LibraryContact = {
  libraryId: string;
  libraryName: string;
  address: string;
  communication: LibraryCommunication;
};

type LibraryContactApi = {
  ok: boolean;
  libraryId: string;
  libraryName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  channel?: string;
  whatsappGroup?: string;
};

const STORAGE_PREFIX = 'library_contact_v2_';
const TTL_MS = 10 * 60 * 1000;

let mem: { libraryId: string; contact: LibraryContact; fetchedAt: number } | null = null;

function storageKey(libraryId: string) {
  return `${STORAGE_PREFIX}${libraryId}`;
}

export function normalizeWhatsAppNumber(input: string) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  if (!/^\d{10,15}$/.test(normalized)) return '';
  return normalized;
}

function mapApiToContact(data: LibraryContactApi): LibraryContact {
  const libraryId = String(data.libraryId || '').trim();
  return {
    libraryId,
    libraryName: String(data.libraryName || 'Library').trim(),
    address: String(data.address || '').trim(),
    communication: {
      whatsapp: normalizeWhatsAppNumber(String(data.whatsapp || '')),
      channel: String(data.channel || '').trim(),
      email: String(data.email || '').trim(),
      phone: String(data.phone || '').trim(),
      whatsappGroup: String(data.whatsappGroup || '').trim(),
    },
  };
}

/** Clear in-memory + persisted contact cache (call on logout / account switch). */
export async function clearLibraryContactCache(libraryId?: string | null) {
  mem = null;
  try {
    await AsyncStorage.removeItem('library_contact_v1');
    if (libraryId) {
      await AsyncStorage.removeItem(storageKey(libraryId));
      return;
    }
    const keys = await AsyncStorage.getAllKeys();
    const contactKeys = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
    if (contactKeys.length) await AsyncStorage.multiRemove(contactKeys);
  } catch {
    // ignore
  }
}

/**
 * Fetch contact for the logged-in student's library only.
 * Cache is scoped per libraryId so switching students/libraries never leaks data.
 */
export async function getLibraryContact(opts?: {
  libraryId: string;
  force?: boolean;
}): Promise<LibraryContact> {
  const libraryId = String(opts?.libraryId || '').trim();
  if (!libraryId) {
    throw new Error('libraryId is required to load library contact');
  }

  const force = Boolean(opts?.force);
  const now = Date.now();

  if (!force && mem?.libraryId === libraryId && now - mem.fetchedAt < TTL_MS) {
    return mem.contact;
  }

  if (!force && (!mem || mem.libraryId !== libraryId)) {
    try {
      const raw = await AsyncStorage.getItem(storageKey(libraryId));
      if (raw) {
        const cached = JSON.parse(raw) as { contact: LibraryContact; fetchedAt: number };
        if (
          cached?.contact?.libraryId === libraryId &&
          typeof cached.fetchedAt === 'number' &&
          now - cached.fetchedAt < TTL_MS
        ) {
          mem = { libraryId, contact: cached.contact, fetchedAt: cached.fetchedAt };
          return cached.contact;
        }
      }
    } catch {
      // ignore
    }
  }

  const data = await apiGet<LibraryContactApi>('/api/student/me/library-contact');
  const resolvedId = String(data.libraryId || libraryId).trim();
  if (resolvedId !== libraryId) {
    throw new Error('Library contact mismatch for this student');
  }

  const contact = mapApiToContact(data);
  mem = { libraryId, contact, fetchedAt: now };
  try {
    await AsyncStorage.setItem(storageKey(libraryId), JSON.stringify(mem));
  } catch {
    // ignore
  }
  return contact;
}

export function toApiErrorMessage(e: unknown) {
  const err = e as ApiError;
  return err?.message || 'Request failed';
}

type StudentContactCtx = {
  studentName?: string;
  studentUsername?: string;
};

function buildWhatsAppMessage(ctx?: StudentContactCtx) {
  const name = String(ctx?.studentName || 'a student').trim();
  const username = String(ctx?.studentUsername || '').trim();
  const who = username ? `${name} (@${username})` : name;
  return `Hello, I am ${who}. I need help with my library account.`;
}

async function openUrl(url: string, label: string) {
  const ok = await Linking.canOpenURL(url);
  if (!ok) throw new Error(`${label} is not available on this device.`);
  await Linking.openURL(url);
}

export async function openLibraryWhatsApp(contact: LibraryContact, ctx?: StudentContactCtx) {
  const whatsapp = contact.communication.whatsapp;
  if (!whatsapp) throw new Error('Library WhatsApp number is not set yet.');
  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(buildWhatsAppMessage(ctx))}`;
  await openUrl(url, 'WhatsApp');
}

export async function openLibraryPhone(contact: LibraryContact) {
  const phone = String(contact.communication.phone || '').replace(/\D/g, '');
  if (!phone) throw new Error('Library phone number is not set yet.');
  await openUrl(`tel:${phone}`, 'Phone');
}

export async function openLibraryWhatsAppGroup(contact: LibraryContact) {
  const url = String(contact.communication.whatsappGroup || '').trim();
  if (!url) throw new Error('Library WhatsApp group link is not set yet.');
  await openUrl(url, 'WhatsApp Group');
}

export async function openLibraryChannel(contact: LibraryContact) {
  const url = String(contact.communication.channel || '').trim();
  if (!url) throw new Error('Library channel link is not set yet.');
  await openUrl(url, 'Channel');
}

export async function openLibraryEmail(contact: LibraryContact) {
  const email = String(contact.communication.email || '').trim();
  if (!email) throw new Error('Library email is not set yet.');
  await openUrl(`mailto:${email}`, 'Email');
}
