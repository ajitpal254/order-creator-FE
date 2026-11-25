// Prerender the public catalog (v0.9 F3).
//
// Fetches the product list from a reachable API base and emits a static
// HTML snapshot of the catalog grid to dist/catalog/index.html, so
// crawlers / link previews see real product names, SKUs, MOQs and lead
// times without running the SPA.
//
// Usage:
//   CATALOG_API_BASE=https://<api>/api npm run prerender:catalog
//   (VITE_API_URL is honoured as a fallback base.)
//
// Graceful no-op: when no base is configured or the API is unreachable
// or returns no products, it logs a clear message and exits 0 — it must
// never break a build. It is deliberately NOT chained into `npm run
// build`; run it explicitly after a build when an API is reachable.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.env.CATALOG_API_BASE || process.env.VITE_API_URL || '')
  .replace(/\/+$/, '');

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const productCard = (p) => `      <article class="product-card">
        <h2>${escapeHtml(p.name)}</h2>
        <p class="sku">${escapeHtml(p.sku)}</p>
        <p>${escapeHtml(p.description || '')}</p>
        <ul>
          <li>MOQ: ${escapeHtml(p.moq ?? 50)} pcs</li>
          ${p.leadTimeDays != null ? `<li>Lead time: ${escapeHtml(p.leadTimeDays)} days</li>` : ''}
          ${p.category ? `<li>Category: ${escapeHtml(p.category)}</li>` : ''}
        </ul>
      </article>`;

const renderCatalogHtml = (products) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>H.A. Overseas Tools Catalog</title>
    <meta name="description" content="Export-grade hand tools from H.A. Overseas: ${escapeHtml(
      products.map((p) => `${p.name} (${p.sku})`).join('; ')
    )}" />
    <meta property="og:title" content="H.A. Overseas Tools Catalog" />
    <meta property="og:type" content="website" />
    <meta property="og:description" content="Explore export-grade hand tools, grease guns, wrenches, and workshop hardware available for custom configuration." />
  </head>
  <body>
    <h1>H.A. Overseas Tools Catalog</h1>
    <main class="catalog-grid">
${products.map(productCard).join('\n')}
    </main>
  </body>
</html>
`;

async function main() {
  if (!base) {
    console.log(
      '[prerender:catalog] No API base configured (set CATALOG_API_BASE or VITE_API_URL) — skipping catalog prerender.'
    );
    return;
  }

  let products;
  try {
    const res = await fetch(`${base}/products`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    products = Array.isArray(data) ? data : data?.data;
    if (!Array.isArray(products)) throw new Error('unexpected products payload');
  } catch (err) {
    console.log(
      `[prerender:catalog] API at ${base} not reachable (${err.message}) — skipping catalog prerender.`
    );
    return;
  }

  if (products.length === 0) {
    console.log('[prerender:catalog] API returned no products — skipping catalog prerender.');
    return;
  }

  const outDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'dist',
    'catalog'
  );
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'index.html');
  await writeFile(outFile, renderCatalogHtml(products), 'utf8');
  console.log(
    `[prerender:catalog] Wrote ${outFile} with ${products.length} product(s).`
  );
}

main().catch((err) => {
  // Never fail the caller: a prerender problem is not a build failure.
  console.log(`[prerender:catalog] Skipped: ${err.message}`);
  process.exitCode = 0;
});
