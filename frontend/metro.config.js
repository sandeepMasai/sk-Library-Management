// @ts-check
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Skip metro-file-map disk snapshot (writes under /var/folders/.../T/).
 * Helps when the boot volume is very low on space (ENOSPC). Slightly slower cold starts.
 * Re-enable disk cache: METRO_FILEMAP_DISK_CACHE=1 npx expo start
 */
if (process.env.METRO_FILEMAP_DISK_CACHE !== '1') {
  config.unstable_fileMapCacheManagerFactory = () => ({
    read: async () => null,
    write: async () => {},
    end: async () => {},
  });
}

module.exports = config;
