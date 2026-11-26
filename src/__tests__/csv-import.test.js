import { describe, expect, it } from 'vitest';
import { findProductForKey, parseBulkImport } from '../lib/csvImport';
import { products } from '../test/fixtures';

// Unit tests for the FE-12 bulk-import parser. The parser only matches
// rows against the catalog and validates quantities — it prices nothing.
describe('parseBulkImport', () => {
  it('parses valid rows matched by product name and by SKU (case-insensitive)', () => {
    const { rows, validRows } = parseBulkImport(
      'Combination Spanner Set 14pc, 200\nhao-gg-400, 50',
      products
    );

    expect(rows).toHaveLength(2);
    expect(validRows).toHaveLength(2);
    expect(validRows[0].product._id).toBe('prod-1');
    expect(validRows[0].quantity).toBe(200);
    expect(validRows[0].error).toBeNull();
    expect(validRows[1].product._id).toBe('prod-2');
    expect(validRows[1].quantity).toBe(50);
  });

  it('skips blank lines and an optional header row', () => {
    const { rows, validRows } = parseBulkImport(
      'product, quantity\n\nHAO-CS-014, 10\n',
      products
    );
    expect(rows).toHaveLength(1);
    expect(validRows).toHaveLength(1);
    expect(validRows[0].lineNumber).toBe(3);
  });

  it('flags an unknown product', () => {
    const { rows, validRows } = parseBulkImport('Nonexistent Widget, 10', products);
    expect(validRows).toHaveLength(0);
    expect(rows[0].product).toBeNull();
    expect(rows[0].error).toMatch(/unknown product/i);
  });

  it('flags bad quantities: non-numeric, zero, negative and fractional', () => {
    for (const bad of ['abc', '0', '-5', '2.5', '']) {
      const text = bad === '' ? 'HAO-CS-014,' : `HAO-CS-014, ${bad}`;
      const { rows, validRows } = parseBulkImport(text, products);
      expect(validRows, `quantity "${bad}"`).toHaveLength(0);
      expect(rows[0].error).toBeTruthy();
    }
    const { rows } = parseBulkImport('HAO-CS-014, abc', products);
    expect(rows[0].error).toMatch(/invalid quantity/i);
  });

  it('flags malformed rows with no comma separator', () => {
    const { rows, validRows } = parseBulkImport(
      'HAO-CS-014 100\njust some text',
      products
    );
    expect(validRows).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].error).toMatch(/malformed row/i);
    expect(rows[1].error).toMatch(/malformed row/i);
  });

  it('keeps valid rows alongside invalid ones, in order, with line numbers', () => {
    const { rows, validRows } = parseBulkImport(
      ['HAO-CS-014, 10', 'Nope, 5', 'HAO-GG-400, xyz', 'broken row'].join('\n'),
      products
    );
    expect(rows.map((r) => r.lineNumber)).toEqual([1, 2, 3, 4]);
    expect(validRows).toHaveLength(1);
    expect(validRows[0].product._id).toBe('prod-1');
  });

  it('returns no rows for empty input', () => {
    expect(parseBulkImport('', products)).toEqual({ rows: [], validRows: [] });
    expect(parseBulkImport('  \n \n', products).rows).toHaveLength(0);
  });
});

describe('findProductForKey', () => {
  it('matches by exact name or SKU, trimmed and case-insensitive', () => {
    expect(findProductForKey(products, '  hao-cs-014 ')?._id).toBe('prod-1');
    expect(findProductForKey(products, 'lever grease gun 400cc')?._id).toBe('prod-2');
    expect(findProductForKey(products, 'partial name')).toBeNull();
    expect(findProductForKey(products, '')).toBeNull();
  });
});
