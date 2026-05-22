import { SITE_URL } from '../seo/config';

export const APK_FILENAME = 'SmartLibDesk-v1.0.2.apk';
export const APK_PATH = `/downloads/${APK_FILENAME}`;
export const APK_VERSION = '1.0.2';

/** Optional full URL (CDN, Railway, etc.) — set VITE_APK_DOWNLOAD_URL on Vercel. */
export function getApkUrl(): string {
  const external = import.meta.env.VITE_APK_DOWNLOAD_URL?.trim();
  if (external) return external;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${APK_PATH}`;
  }
  return `${SITE_URL}${APK_PATH}`;
}

/** QR should open this page — then user taps Download (works when APK is missing too). */
export function getDownloadPageUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/download`;
  }
  return `${SITE_URL}/download`;
}
