import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, Package, RotateCcw } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { FxRateLine } from '../order/FxRateLine';

// One order row for the buyer dashboard (FE-13): order number, date,
// status chip (shared StatusBadge) and the order total EXACTLY as the
// API returned it — display only, never recomputed.
//
// Clicking the card goes to /my-orders (the app's order list/detail
// flow — there is no per-order detail route). Optional actions:
//  - Invoice PDF via the existing downloadPdf flow (unchanged).
//  - "Order again" (clones the order into a new draft; the parent page
//    owns the mutation + error state).
export const BuyerOrderCard = ({
  order,
  onDownloadPdf,
  downloading = false,
  onOrderAgain = null,
  orderingAgain = false,
}) => {
  const navigate = useNavigate();

  const placedOn = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div
      className="glass-card buyer-order-card"
      onClick={() => navigate('/my-orders')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate('/my-orders');
      }}
    >
      <div className="buyer-order-card__main">
        <div className="buyer-order-card__icon">
          <Package size={20} color="var(--accent-amber)" />
        </div>
        <div>
          <div className="buyer-order-card__number-row">
            <span className="buyer-order-card__number">{order.orderNumber}</span>
            <StatusBadge status={order.status} />
          </div>
          {placedOn && (
            <span className="buyer-order-card__date">Placed on {placedOn}</span>
          )}
          {order.estimatedShipDate && (
            <span className="buyer-order-card__date" style={{ display: 'block' }}>
              Estimated ship date:{' '}
              {new Date(order.estimatedShipDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      <div className="buyer-order-card__side">
        <div className="buyer-order-card__total">
          <span className="buyer-order-card__total-label">Order Value (FOB):</span>
          <span className="buyer-order-card__total-value">
            ${order.totalAmount?.toFixed(2)} USD
          </span>
          <FxRateLine order={order} />
        </div>

        <div className="buyer-order-card__actions">
          {onOrderAgain && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={orderingAgain}
              onClick={(e) => {
                e.stopPropagation();
                onOrderAgain(order);
              }}
            >
              <RotateCcw size={15} />
              <span>{orderingAgain ? 'Creating draft...' : 'Order again'}</span>
            </button>
          )}

          {onDownloadPdf && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={downloading}
              title="Download PDF"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadPdf(order);
              }}
            >
              <FileDown size={16} />
              <span>{downloading ? 'Downloading...' : 'PDF'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
