#!/usr/bin/env node
/**
 * Copy Android release APK into website/public/downloads for /download page.
 * Run from website/: node scripts/copy-apk.mjs
 *
 * If public/downloads/*.apk already exists (committed for Vercel), keep it when no build output is found.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'downloads');
const outFile = join(outDir, 'SmartLibDesk-v1.0.2.apk');

const sources = [
  join(root, '..', 'frontend', 'dist', 'SmartLibDesk-v1.0.2.apk'),
  join(root, '..', 'frontend', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
];

mkdirSync(outDir, { recursive: true });

const src = sources.find((p) => existsSync(p));
if (src) {
  copyFileSync(src, outFile);
  const mb = (statSync(outFile).size / (1024 * 1024)).toFixed(1);
  console.log(`[copy-apk] OK → ${outFile} (${mb} MB)`);
  process.exit(0);
}

if (existsSync(outFile)) {
  const mb = (statSync(outFile).size / (1024 * 1024)).toFixed(1);
  console.log(`[copy-apk] Using existing committed APK (${mb} MB) → ${outFile}`);
  process.exit(0);
}

console.warn('[copy-apk] No APK found — /downloads will 404 until you:');
console.warn('  1) frontend: npm run build:apk  then  cd website && npm run copy-apk');
console.warn('  2) commit public/downloads/SmartLibDesk-v1.0.2.apk and redeploy Vercel');
console.warn('  3) or set VITE_APK_DOWNLOAD_URL to a hosted APK URL');
process.exit(0);
