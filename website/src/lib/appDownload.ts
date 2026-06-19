import { SITE_URL } from '../seo/config';

export const APK_FILENAME = 'SmartLibDesk-v1.0.2.apk';
export const APK_PATH = `/downloads/${APK_FILENAME}`;
export const APK_VERSION = '1.0.2';

function siteOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  const devOrigin = import.meta.env.VITE_DEV_ORIGIN?.trim();
  if (devOrigin) return devOrigin.replace(/\/$/, '');
  return SITE_URL;
}

/** Optional full URL (CDN, Railway, etc.) — set VITE_APK_DOWNLOAD_URL on Vercel. */
export function getApkUrl(): string {
  const external = import.meta.env.VITE_APK_DOWNLOAD_URL?.trim();
  if (external) return external;
  return `${siteOrigin()}${APK_PATH}`;
}

/** QR opens this page — then user taps Download APK. */
export function getDownloadPageUrl(): string {
  return `${siteOrigin()}/download`;
}

/** Vite dev server often rejects HEAD; use a tiny GET instead. */
export async function checkApkAvailable(apkUrl: string): Promise<boolean> {
  try {
    const res = await fetch(apkUrl, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    });
    return res.ok || res.status === 206;
  } catch {
    return import.meta.env.DEV;
  }
}
