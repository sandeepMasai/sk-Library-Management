/** Normalize a Cloudinary / HTTPS image URL from API responses. */
export function normalizeImageUrl(url: unknown): string | null {
  const raw = String(url ?? '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  return raw;
}

/** Use as React Native <Image key={...} /> when URL may be overwritten at same public_id. */
export function imageCacheKey(url: string | null | undefined): string {
  return normalizeImageUrl(url) || 'no-image';
}
