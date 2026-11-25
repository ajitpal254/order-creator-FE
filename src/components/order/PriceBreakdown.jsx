import React, { useState } from 'react';
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react';

// Price-breakdown drawer (FE-12) — DISPLAY ONLY.
//
// Every figure rendered here is read verbatim from the `totals` object
// the order sheet already receives from OrderContext (the existing
// pricing flow), plus any breakdown fields that same object happens to
// carry. This component computes NOTHING: no tier discount, tax or
// freight figure is derived here. When the existing flow does not
// surface one of those figures separately (today it does not — totals
// carries only totalQuantity / totalAmount / estimatedWeightKg /
// estimatedCartons), that line is simply omitted rather than invented.
const OPTIONAL_LINES = [
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'tierDiscount', label: 'Tier Discount' },
  { key: 'discount', label: 'Discount' },
  { key: 'tax', label: 'Tax' },
  { key: 'taxAmount', label: 'Tax' },
  { key: 'freight', label: 'Freight' },
  { key: 'freightAmount', label: 'Freight' },
  { key: 'shipping', label: 'Shipping' },
];

const money = (value) => `$${Number(value).toFixed(2)}`;

export const PriceBreakdown = ({ totals }) => {
  const [open, setOpen] = useState(false);
  if (!totals) return null;

  const optionalLines = OPTIONAL_LINES.filter(
    (line) => typeof totals[line.key] === 'number'
  );
  // De-duplicate labels (e.g. tax vs taxAmount both present).
  const seenLabels = new Set();
  const breakdownLines = optionalLines.filter((line) => {
    if (seenLabels.has(line.label)) return false;
    seenLabels.add(line.label);
    return true;
  });

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Receipt size={14} />
        <span>Price Breakdown</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div
          data-testid="price-breakdown"
          style={{
            marginTop: '0.75rem',
            backgroundColor: '#111827',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
          }}
        >
          {breakdownLines.map((line) => (
            <div
              key={line.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.35rem 0',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span>{line.label}</span>
              <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
                {money(totals[line.key])}
              </span>
            </div>
          ))}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.35rem 0',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Total Quantity</span>
            <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
              {totals.totalQuantity} pcs
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.35rem 0',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Est. Gross Weight</span>
            <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
              {totals.estimatedWeightKg} kg
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.35rem 0',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Est. Master Cartons</span>
            <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
              {totals.estimatedCartons} ctns
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              marginTop: '0.5rem',
              paddingTop: '0.6rem',
              fontSize: '1rem',
            }}
          >
            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Grand Total (FOB)</span>
            <span style={{ fontWeight: 900, color: 'var(--accent-amber)' }}>
              {money(totals.totalAmount || 0)} USD
            </span>
          </div>

          {breakdownLines.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
              Tier discount, tax and freight are not broken out separately by the
              current pricing response, so only the figures it provides are shown.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
