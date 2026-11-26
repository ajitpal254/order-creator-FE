import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileWarning, X } from 'lucide-react';

// Proposal confirmation card (v1.0 FEAT-16 Stages 3–4 — F2).
// Rendered inside the assistant drawer when a message response (or a PO
// extraction) carries a proposal { id, kind, summary, payload, expiresAt }.
//
// The card is presentational about the proposal lifecycle: the widget owns
// the proposal state (pending / confirming / confirmed / dismissed /
// error) on the message so it survives drawer close/reopen, and performs
// the confirm/dismiss API calls.
//
// `review` mode (PO extraction): line quantities are editable and
// unmatched lines are removable — but ONLY locally. The confirm endpoint
// (POST /assistant/proposals/:id/confirm) takes no body, so edits cannot
// be sent to the server; the card says so plainly and Confirm creates the
// draft from the proposal exactly as the server extracted it.
//
// Prices, when the payload carries them, are displayed verbatim from the
// payload — nothing is priced, summed or taxed client-side.

// Line items can live under a few payload keys depending on the producer
// (chat proposal vs PO extraction); the payload itself may also be a list.
export const getProposalLines = (proposal) => {
  const payload = proposal?.payload;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.lines)) return payload.lines;
    if (Array.isArray(payload.lineItems)) return payload.lineItems;
  }
  if (Array.isArray(proposal?.items)) return proposal.items;
  return [];
};

// A line is matched when the server says so explicitly, or when it
// carries a resolved product reference. A bare product name / raw text
// with no reference and no flag is treated as unmatched.
export const isLineMatched = (line) => {
  if (!line || typeof line !== 'object') return false;
  if (typeof line.matched === 'boolean') return line.matched;
  if (line.unmatched === true) return false;
  return Boolean(line.product || line.productId || line.matchedProduct);
};

export const lineLabel = (line) => {
  if (!line || typeof line !== 'object') return 'Line item';
  const product =
    line.product && typeof line.product === 'object' ? line.product : null;
  return (
    line.productName ||
    line.name ||
    product?.name ||
    line.rawText ||
    line.description ||
    line.sku ||
    product?.sku ||
    'Line item'
  );
};

const lineSku = (line) => {
  const product =
    line?.product && typeof line.product === 'object' ? line.product : null;
  return line?.sku || product?.sku || null;
};

const lineQuantity = (line) => line?.quantity ?? line?.qty ?? null;

export const isProposalExpired = (proposal, now = new Date()) => {
  if (!proposal?.expiresAt) return false;
  const expiry = new Date(proposal.expiresAt).getTime();
  if (Number.isNaN(expiry)) return false;
  return expiry <= now.getTime();
};

const formatExpiry = (expiresAt) => {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const humanKind = (kind) => {
  if (typeof kind !== 'string' || !kind) return 'Proposal';
  const words = kind.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Proposal';
};

const lineKey = (line, index) =>
  line?.id ?? line?.lineId ?? line?.product ?? line?.productId ?? `line-${index}`;

export const ProposalCard = ({
  proposal,
  state = { status: 'pending' },
  review = false,
  onConfirm,
  onDismiss,
}) => {
  // Review-mode local edits (see header note: never sent to the server).
  const [removedKeys, setRemovedKeys] = useState(() => new Set());
  const [quantities, setQuantities] = useState({});

  if (!proposal || !proposal.id) return null;

  const status = state?.status || 'pending';
  const busy = status === 'confirming' || status === 'dismissing';
  const expired = status === 'pending' && isProposalExpired(proposal);
  const editsDisabled = busy || status !== 'pending' || expired;
  const lines = getProposalLines(proposal);
  const expiryText = proposal.expiresAt ? formatExpiry(proposal.expiresAt) : null;
  const order = state?.order || null;

  const visibleLines = lines
    .map((line, index) => ({ line, index, key: lineKey(line, index) }))
    .filter(({ key }) => !removedKeys.has(key));

  const removeLine = (key) =>
    setRemovedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

  return (
    <div
      className={`assistant-proposal${expired ? ' assistant-proposal-expired' : ''}`}
      data-proposal-id={proposal.id}
    >
      <div className="assistant-proposal-header">
        <span className="assistant-proposal-kind">{humanKind(proposal.kind)}</span>
        {review && <span className="assistant-proposal-source">From PO upload</span>}
      </div>

      {proposal.summary && (
        <p className="assistant-proposal-summary">{proposal.summary}</p>
      )}

      {visibleLines.length > 0 && (
        <ul className="assistant-proposal-lines">
          {visibleLines.map(({ line, key }) => {
            const matched = isLineMatched(line);
            const name = lineLabel(line);
            const sku = lineSku(line);
            const qty = quantities[key] ?? lineQuantity(line);
            return (
              <li key={key} className="assistant-proposal-line">
                <div className="assistant-proposal-line-main">
                  <span className="assistant-proposal-line-name">{name}</span>
                  {sku && <span className="assistant-proposal-line-sku">{sku}</span>}
                  <span
                    className={`assistant-proposal-badge${
                      matched
                        ? ' assistant-proposal-badge-matched'
                        : ' assistant-proposal-badge-unmatched'
                    }`}
                  >
                    {matched ? 'Matched' : 'Unmatched'}
                  </span>
                </div>

                {review ? (
                  <div className="assistant-proposal-line-controls">
                    <label className="assistant-proposal-qty">
                      <span>Qty</span>
                      <input
                        type="number"
                        min="1"
                        aria-label={`Quantity for ${name}`}
                        value={qty ?? ''}
                        disabled={editsDisabled}
                        onChange={(event) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    {!matched && (
                      <button
                        type="button"
                        className="assistant-proposal-remove"
                        aria-label={`Remove line ${name}`}
                        disabled={editsDisabled}
                        onClick={() => removeLine(key)}
                      >
                        <X size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="assistant-proposal-line-meta">
                    {qty != null && qty !== '' ? `Qty ${qty}` : ''}
                    {typeof line.unitPrice === 'number'
                      ? `${qty != null && qty !== '' ? ' · ' : ''}$${line.unitPrice.toFixed(2)} each`
                      : ''}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {review && status === 'pending' && (
        <p className="assistant-proposal-note">
          Review only: quantity edits and removals are not sent on confirm —
          the draft is created from the extracted proposal as-is.
        </p>
      )}

      {expiryText && status === 'pending' && (
        <p className="assistant-proposal-expiry">
          <Clock size={12} aria-hidden="true" />
          {expired ? `Expired on ${expiryText}` : `Expires ${expiryText}`}
        </p>
      )}

      {status === 'confirmed' ? (
        <div className="assistant-proposal-result assistant-proposal-success" role="status">
          <CheckCircle2 size={15} aria-hidden="true" />
          <span>
            Draft order created.
            {order && (
              <>
                {' '}
                {/* There is no per-order detail route — orders are
                    viewed in the My Orders list (see BuyerOrderCard). */}
                <Link className="assistant-proposal-order-link" to="/my-orders">
                  View draft order{order.orderNumber ? ` ${order.orderNumber}` : ''}
                </Link>
              </>
            )}
          </span>
        </div>
      ) : status === 'dismissed' ? (
        <p className="assistant-proposal-result" role="status">
          Proposal dismissed.
        </p>
      ) : expired ? (
        <>
          <p className="assistant-proposal-result assistant-proposal-stale" role="status">
            <FileWarning size={14} aria-hidden="true" />
            This proposal has expired and can no longer be confirmed.
          </p>
          <div className="assistant-proposal-actions">
            <button type="button" className="assistant-proposal-confirm" disabled>
              Confirm
            </button>
            <button type="button" className="assistant-proposal-dismiss" disabled>
              Dismiss
            </button>
          </div>
        </>
      ) : (
        <>
          {status === 'error' && state?.error && (
            <p className="assistant-proposal-error" role="alert">
              {state.error}
            </p>
          )}
          <div className="assistant-proposal-actions">
            <button
              type="button"
              className="assistant-proposal-confirm"
              disabled={busy}
              onClick={() => onConfirm?.(proposal.id)}
            >
              {status === 'confirming' ? 'Creating draft…' : 'Confirm'}
            </button>
            <button
              type="button"
              className="assistant-proposal-dismiss"
              disabled={busy}
              onClick={() => onDismiss?.(proposal.id)}
            >
              {status === 'dismissing' ? 'Dismissing…' : 'Dismiss'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProposalCard;
