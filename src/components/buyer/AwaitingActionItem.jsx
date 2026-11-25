import React from 'react';
import { Link } from 'react-router-dom';
import { FileDown, FileEdit, Receipt } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';

// One "Awaiting your action" row for the buyer dashboard (FE-13).
//
// Two kinds exist today:
//  - kind="draft": an order still in Draft. The only place an order is
//    built/submitted in this app is the Order Creator, so the action
//    links there. (There is no buyer confirm-delivery action anywhere
//    in the existing UI/state model, so none is offered here.)
//  - kind="invoice": an order whose invoice is unpaid / partially paid.
//    DISPLAY ONLY — every figure is rendered exactly as the API
//    returned it; the only action is the existing invoice PDF download.
export const AwaitingActionItem = ({
  kind,
  order,
  invoice = null,
  onDownloadPdf,
  downloading = false,
}) => {
  if (kind === 'draft') {
    return (
      <div className="glass-card buyer-action-item">
        <div className="buyer-action-item__main">
          <div className="buyer-order-card__icon">
            <FileEdit size={20} color="var(--accent-amber)" />
          </div>
          <div>
            <div className="buyer-order-card__number-row">
              <span className="buyer-action-item__heading">{order.orderNumber}</span>
              <StatusBadge status={order.status} />
            </div>
            <span className="buyer-action-item__detail">
              Draft saved — not yet submitted for production.
            </span>
          </div>
        </div>
        <Link to="/order-creator" className="btn btn-primary btn-sm">
          <span>Continue in Order Creator</span>
        </Link>
      </div>
    );
  }

  // kind === 'invoice' — display-only figures, straight from the API.
  return (
    <div className="glass-card buyer-action-item">
      <div className="buyer-action-item__main">
        <div className="buyer-order-card__icon">
          <Receipt size={20} color="var(--accent-rose)" />
        </div>
        <div>
          <div className="buyer-order-card__number-row">
            <span className="buyer-action-item__heading">{order.orderNumber}</span>
            <span className="badge badge-rose">
              Invoice {invoice?.status || 'Unpaid'}
            </span>
          </div>
          <span className="buyer-action-item__detail">
            {invoice?.invoiceId
              ? `Invoice ${invoice.invoiceId} is awaiting payment.`
              : 'This order has an invoice awaiting payment.'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div className="buyer-action-item__figures">
          {typeof invoice?.amountPaid === 'number' && (
            <div>
              <span className="buyer-action-item__figure-label">Paid</span>
              <span className="buyer-action-item__figure-value">
                ${invoice.amountPaid.toFixed(2)} USD
              </span>
            </div>
          )}
          <div>
            <span className="buyer-action-item__figure-label">
              {typeof invoice?.balanceDue === 'number' ? 'Balance Due' : 'Order Total'}
            </span>
            <span className="buyer-action-item__figure-value buyer-action-item__figure-value--due">
              $
              {(typeof invoice?.balanceDue === 'number'
                ? invoice.balanceDue
                : order.totalAmount
              )?.toFixed(2)}{' '}
              USD
            </span>
          </div>
        </div>

        {onDownloadPdf && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={downloading}
            title="Download PDF"
            onClick={() => onDownloadPdf(order)}
          >
            <FileDown size={16} />
            <span>{downloading ? 'Downloading...' : 'Invoice PDF'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
