import { SITE_URL } from '../seo/config';

export const PLAY_STORE_PACKAGE_ID = 'com.libdesk.app';
export const PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL?.trim() ||
  'https://play.google.com/store/apps/details?id=com.libdesk.app&pcampaignid=web_share';

export const APP_VERSION = '1.0.2';

function siteOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  const devOrigin = import.meta.env.VITE_DEV_ORIGIN?.trim();
  if (devOrigin) return devOrigin.replace(/\/$/, '');
  return SITE_URL;
}

/** Opens Google Play Store (Play app on Android, browser elsewhere). */
export function getPlayStoreUrl(): string {
  return PLAY_STORE_URL;
}

/** Marketing download page with Play Store CTA and QR. */
export function getDownloadPageUrl(): string {
  return `${siteOrigin()}/download`;
}

export function openPlayStore(): void {
  window.location.assign(getPlayStoreUrl());
}
