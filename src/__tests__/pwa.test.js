import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// FE-15 (v0.9 F2): source-level PWA invariants. The post-build artifact
// check (dist/manifest.webmanifest + dist/sw.js) lives in
// scripts/check-pwa-artifacts.mjs — run `npm run build && npm run check:pwa`.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('PWA manifest (FE-15)', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8'));

  it('has the required identity fields', () => {
    expect(manifest.name).toBe('H.A. Overseas Order Creator');
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#090D16');
    expect(manifest.background_color).toBe('#090D16');
  });

  it('declares 192x192 and 512x512 PNG icons plus the SVG icon, all present in public/', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.type === 'image/svg+xml')).toBe(true);
    for (const icon of manifest.icons) {
      expect(existsSync(join(root, 'public', icon.src)), icon.src).toBe(true);
    }
  });
});

describe('service worker caching rules (FE-15)', () => {
  const sw = readFileSync(join(root, 'public/sw.js'), 'utf8');

  it('uses a versioned cache name and cleans up old caches on activate', () => {
    expect(sw).toContain('hao-v0.9.0');
    expect(sw).toContain("addEventListener('activate'");
    expect(sw).toContain('caches.delete');
  });

  it('caches only the products catalog API; other API traffic is network-only', () => {
    expect(sw).toContain("startsWith('/api/products')");
    expect(sw).toContain("startsWith('/api/')");
    // Non-GET requests are never intercepted for caching.
    expect(sw).toContain("request.method !== 'GET'");
  });

  it('is registered only in production builds', () => {
    const registration = readFileSync(join(root, 'src/pwa/registerServiceWorker.js'), 'utf8');
    expect(registration).toContain('import.meta.env.PROD');
    expect(registration).toContain("register('/sw.js')");
  });
});
