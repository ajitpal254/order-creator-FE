// Bulk-import parser for the Order Creator (FE-12).
//
// Input: free-text CSV rows, one per line, in the form
//   "product name or SKU, quantity"
// e.g.
//   Combination Spanner Set 14pc, 200
//   HAO-GG-400, 50
//
// Matching is done client-side against the product catalog the page has
// already loaded, by exact (case-insensitive, trimmed) product name or
// SKU. Nothing is priced here — a valid row only carries the matched
// catalog product and the requested quantity; the caller builds the
// line item from the product's own catalog fields, exactly as the
// configurator does for a manually added line.
//
// Output: { rows, validRows }
// Each row: { lineNumber, raw, productKey, quantity, product, error }
//   - product: the matched catalog product, or null
//   - quantity: the parsed positive integer, or null
//   - error: a human-readable validation message, or null when valid
// Blank lines are skipped. An optional header line ("product, quantity"
// and similar spellings) is skipped too.

const HEADER_KEYS = new Set([
  'product',
  'product name',
  'product name or sku',
  'name',
  'sku',
  'item',
]);

const HEADER_QTY_KEYS = new Set(['quantity', 'qty', 'pieces', 'pcs']);

export const findProductForKey = (products, key) => {
  const needle = String(key || '').trim().toLowerCase();
  if (!needle) return null;
  return (
    (products || []).find(
      (p) =>
        String(p?.name || '').trim().toLowerCase() === needle ||
        String(p?.sku || '').trim().toLowerCase() === needle
    ) || null
  );
};

const isHeaderRow = (productKey, quantityKey) =>
  HEADER_KEYS.has(String(productKey).trim().toLowerCase()) &&
  HEADER_QTY_KEYS.has(String(quantityKey).trim().toLowerCase());

export const parseBulkImport = (text, products = []) => {
  const rows = [];
  const lines = String(text || '').split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const raw = rawLine.trim();
    if (!raw) return; // blank line — not a row at all

    const lineNumber = index + 1;

    // Split on the LAST comma so a product name containing a comma
    // still parses; the quantity is always the final field.
    const commaIdx = raw.lastIndexOf(',');
    if (commaIdx === -1) {
      rows.push({
        lineNumber,
        raw,
        productKey: raw,
        quantity: null,
        product: null,
        error: 'Malformed row: expected "product name or SKU, quantity".',
      });
      return;
    }

    const productKey = raw.slice(0, commaIdx).trim();
    const quantityRaw = raw.slice(commaIdx + 1).trim();

    if (isHeaderRow(productKey, quantityRaw)) return; // optional header

    if (!productKey || !quantityRaw) {
      rows.push({
        lineNumber,
        raw,
        productKey,
        quantity: null,
        product: null,
        error: 'Malformed row: expected "product name or SKU, quantity".',
      });
      return;
    }

    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      rows.push({
        lineNumber,
        raw,
        productKey,
        quantity: null,
        product: findProductForKey(products, productKey),
        error: `Invalid quantity "${quantityRaw}": enter a whole number of pieces greater than 0.`,
      });
      return;
    }

    const product = findProductForKey(products, productKey);
    if (!product) {
      rows.push({
        lineNumber,
        raw,
        productKey,
        quantity,
        product: null,
        error: `Unknown product "${productKey}": no catalog match by name or SKU.`,
      });
      return;
    }

    rows.push({ lineNumber, raw, productKey, quantity, product, error: null });
  });

  return { rows, validRows: rows.filter((r) => !r.error) };
};
