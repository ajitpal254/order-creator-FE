import React from 'react';
import './invoices.css';

// Paper invoice preview (FE-10) — presentation only.
//
// A light "paper" rendering of the invoice figures that ALREADY live on
// the order object (orderNumber, items[].{productName, quantity,
// unitPrice, totalPrice}, totalAmount). Nothing is computed here: values
// are rendered exactly as the API returned them (toFixed formatting only,
// same as the rest of the app). This is NOT a PDF replica — the official
// document is still orderApi.downloadPdf, unchanged.
//
// Amounts are shown as bare numbers under "(USD)" column headers, the
// classic paper-invoice layout, which also keeps these figures visually
// distinct from the dark items table beside it.
export const InvoicePreview = ({ order }) => {
  if (!order) return null;

  return (
    <div className="invoice-paper" data-testid="invoice-preview">
      <div className="invoice-paper-header">
        <span className="invoice-paper-brand">H.A. OVERSEAS</span>
        <span className="invoice-paper-doc">Proforma Invoice</span>
      </div>

      <dl className="invoice-paper-meta">
        <dt>Order No.</dt>
        <dd>{order.orderNumber}</dd>
        <dt>Date</dt>
        <dd>
          {new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </dd>
        {order.status && (
          <>
            <dt>Status</dt>
            <dd>{order.status}</dd>
          </>
        )}
      </dl>

      <table className="invoice-paper-table">
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Unit Price (USD)</th>
            <th className="num">Amount (USD)</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, idx) => (
            <tr key={idx}>
              <td>
                <div className="invoice-paper-item-name">
                  {item.productName} · {item.sku}
                </div>
              </td>
              <td className="num">{item.quantity}</td>
              <td className="num">{item.unitPrice?.toFixed(2)}</td>
              <td className="num">{item.totalPrice?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-paper-total-row">
        <span className="invoice-paper-total-label">Total (USD)</span>
        <span className="invoice-paper-total-value">{order.totalAmount?.toFixed(2)}</span>
      </div>

      {order.shippingMarks && (
        <div className="invoice-paper-marks">Marks: {order.shippingMarks}</div>
      )}

      <p className="invoice-paper-note">
        Preview of the figures on this order. The official PDF proforma invoice is
        available via the PDF download.
      </p>
    </div>
  );
};
