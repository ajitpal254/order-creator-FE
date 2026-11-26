// PWA build-artifact check (FE-15). Run AFTER `npm run build`:
//
//   npm run build && npm run check:pwa
//
// Asserts that the production bundle actually ships the web app manifest
// (with the required fields and icon entries) and the hand-rolled service
// worker with its caching rules intact. Exits non-zero on any failure so
// it can gate a release.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures.push(label);
};

const manifestPath = join(dist, 'manifest.webmanifest');
check(existsSync(manifestPath), 'dist/manifest.webmanifest exists');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  check(manifest.name === 'H.A. Overseas Order Creator', 'manifest name is "H.A. Overseas Order Creator"');
  check(Boolean(manifest.short_name), 'manifest has short_name');
  check(manifest.display === 'standalone', 'manifest display is standalone');
  check(Boolean(manifest.theme_color && manifest.background_color), 'manifest has theme/background colors');
  const sizes = (manifest.icons || []).map((i) => i.sizes);
  check(sizes.includes('192x192'), 'manifest declares a 192x192 icon');
  check(sizes.includes('512x512'), 'manifest declares a 512x512 icon');
  for (const icon of manifest.icons || []) {
    check(existsSync(join(dist, icon.src)), `icon file shipped: ${icon.src}`);
  }
}

const swPath = join(dist, 'sw.js');
check(existsSync(swPath), 'dist/sw.js exists');
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8');
  check(sw.includes('hao-v0.9.0'), 'sw.js carries the versioned cache name (hao-v0.9.0)');
  check(sw.includes('/api/products'), 'sw.js special-cases the products catalog API');
  check(sw.includes("addEventListener('activate'"), 'sw.js cleans up old caches on activate');
}

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
check(indexHtml.includes('rel="manifest"'), 'dist/index.html links the manifest');
check(indexHtml.includes('name="theme-color"'), 'dist/index.html has the theme-color meta');

if (failures.length > 0) {
  console.error(`\n${failures.length} PWA artifact check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll PWA artifact checks passed.');
