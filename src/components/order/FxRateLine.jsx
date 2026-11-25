import React from 'react';

// Locked-FX display line (v0.5 F3).
//
// When an order was confirmed, the backend locks the FX rate on the
// order itself (fxRateLocked: the locked rate, baseCurrency: the base
// currency code, baseTotal: the order total in that base currency).
// This renders those stored values verbatim — display only. No
// conversion is computed here and no total is ever recomputed; when the
// fields are absent (order not confirmed / no lock) nothing renders.
export const FxRateLine = ({ order }) => {
  if (!order) return null;
  if (order.fxRateLocked == null || order.baseTotal == null) return null;

  const baseCurrency = order.baseCurrency || 'USD';
  const baseTotal =
    typeof order.baseTotal === 'number'
      ? order.baseTotal.toFixed(2)
      : order.baseTotal;

  return (
    <span
      data-testid="fx-rate-line"
      style={{
        display: 'block',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginTop: '0.25rem',
      }}
    >
      Total locked at 1 {baseCurrency} = {order.fxRateLocked} · base total{' '}
      {baseTotal} {baseCurrency}
    </span>
  );
};

export default FxRateLine;
