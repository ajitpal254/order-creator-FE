import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ApprovalStatusChip } from './ApprovalStatusChip';
import { getOrderCompanyName } from '../../api/companies';

// One company order awaiting approval (v0.9 F3), shared by the Settings
// Companies section and the buyer dashboard's approval queue. Approve
// fires immediately; Reject opens an inline reason form (no browser
// prompt) and sends the reason with the reject call. Figures are the
// API's, rendered verbatim.
export const ApprovalOrderRow = ({ order, onApprove, onReject, busy = false }) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const companyName = getOrderCompanyName(order);

  const handleReject = async (e) => {
    e.preventDefault();
    await onReject?.(order, reason.trim());
    setRejecting(false);
    setReason('');
  };

  return (
    <div
      style={{
        backgroundColor: '#111827',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <b style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>
              {order.orderNumber || order._id}
            </b>
            <ApprovalStatusChip order={order} />
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {companyName ? `${companyName} · ` : ''}
            {typeof order.totalAmount === 'number'
              ? `$${order.totalAmount.toFixed(2)} USD`
              : ''}
          </span>
        </div>
        {!rejecting && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => onApprove?.(order)}
            >
              <Check size={14} />
              <span>Approve</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => setRejecting(true)}
            >
              <X size={14} />
              <span>Reject</span>
            </button>
          </div>
        )}
      </div>
      {rejecting && (
        <form
          onSubmit={handleReject}
          style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}
        >
          <input
            type="text"
            className="form-control"
            style={{ flex: '1 1 220px' }}
            placeholder="Reason for rejection"
            aria-label="Rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button type="submit" className="btn btn-danger btn-sm" disabled={busy}>
            Confirm reject
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setRejecting(false)}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};

export default ApprovalOrderRow;
