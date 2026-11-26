import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileDown, AlertTriangle, CheckCircle2, XCircle, Send } from 'lucide-react';
import { quotesApi } from '../../api/quotes';
import { orderKeys } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext';

// Quote negotiation panel (v0.5 F1). Rendered only for orders whose
// orderType is 'Quote' — returns null for regular orders.
//
// Data comes straight from the order object (quoteValidityDate,
// quoteVersion, counterOffers[]) and from the quote endpoints in
// src/api/quotes.js. Amounts are shown exactly as the API returns them;
// no pricing is computed here.
//
// Roles (from AuthContext, same helpers the rest of the app uses):
//  - staff (user.role === 'admin' / isAdmin): can respond to pending
//    counter-offers and download the quote PDF.
//  - the buyer who owns the order: can counter-offer, accept or decline
//    the quote, and download the quote PDF — unless the quote has
//    expired (quoteValidityDate in the past), which disables all three.
// onOrderUpdated(updatedOrder) is optional: hosts that keep their own
// order state (the admin dashboard) use it to stay in sync; the buyer
// My Orders page relies on TanStack Query invalidation instead.

const offerStatusBadgeClass = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'accepted':
      return 'badge-emerald';
    case 'declined':
    case 'rejected':
      return 'badge-rose';
    case 'pending':
      return 'badge-amber';
    default:
      return 'badge-slate';
  }
};

export const CounterOfferStatusBadge = ({ status }) => (
  <span className={`badge ${offerStatusBadgeClass(status)}`}>{status}</span>
);

// A quote stays usable through the end of its validity date.
export const isQuoteExpired = (order) => {
  if (!order?.quoteValidityDate) return false;
  const end = new Date(order.quoteValidityDate);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
};

const ownerIdOf = (order) => {
  const owner = order?.user ?? order?.buyer ?? order?.customer;
  if (!owner) return null;
  return typeof owner === 'object' ? owner._id ?? owner.id ?? null : owner;
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const QuotePanel = ({ order, onOrderUpdated }) => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Local copy so mutation responses (which return the updated order)
  // refresh the thread immediately even where the host keeps its own
  // state; resynced whenever the host passes a different order object.
  const [current, setCurrent] = useState(order);
  useEffect(() => {
    setCurrent(order);
  }, [order]);

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [downloadingQuotePdf, setDownloadingQuotePdf] = useState(false);
  const [actionError, setActionError] = useState(null);

  const expired = isQuoteExpired(current);
  const isStaff = Boolean(isAdmin) || user?.role === 'admin';
  const ownerId = ownerIdOf(current);
  // My Orders only ever returns the signed-in buyer's own orders, so when
  // the order carries no explicit owner id a buyer viewer is the owner.
  const isOwnerBuyer =
    !isStaff &&
    Boolean(user) &&
    (ownerId == null || String(ownerId) === String(user._id ?? user.id));
  const canActAsBuyer = isOwnerBuyer && !expired;

  const applyUpdatedOrder = (res) => {
    const updated = res?.data ?? res?.order ?? null;
    if (updated && updated._id === current._id) {
      setCurrent(updated);
      onOrderUpdated?.(updated);
    }
    queryClient.invalidateQueries({ queryKey: orderKeys.my });
    queryClient.invalidateQueries({ queryKey: orderKeys.all });
  };

  const mutationOptions = {
    onSuccess: applyUpdatedOrder,
    onError: (err) => setActionError(err.message || 'Something went wrong'),
  };

  const counterOfferMutation = useMutation({
    mutationFn: (payload) => quotesApi.submitCounterOffer(current._id, payload),
    ...mutationOptions,
    onSuccess: (res) => {
      applyUpdatedOrder(res);
      setAmount('');
      setMessage('');
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ offerId, accept }) =>
      quotesApi.respondToCounterOffer(current._id, offerId, accept),
    ...mutationOptions,
  });

  const acceptMutation = useMutation({
    mutationFn: () => quotesApi.acceptQuote(current._id),
    ...mutationOptions,
  });

  const declineMutation = useMutation({
    mutationFn: (reason) => quotesApi.declineQuote(current._id, reason),
    ...mutationOptions,
    onSuccess: (res) => {
      applyUpdatedOrder(res);
      setShowDecline(false);
      setDeclineReason('');
    },
  });

  const anyPending =
    counterOfferMutation.isPending ||
    respondMutation.isPending ||
    acceptMutation.isPending ||
    declineMutation.isPending;

  const handleCounterOfferSubmit = (e) => {
    e.preventDefault();
    setActionError(null);
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setActionError('Enter a valid counter-offer amount.');
      return;
    }
    counterOfferMutation.mutate({ amount: parsed, message: message.trim() });
  };

  const handleDownloadQuotePdf = async () => {
    try {
      setDownloadingQuotePdf(true);
      await quotesApi.downloadQuotePdf(current._id, current.orderNumber);
    } catch (err) {
      alert('Error downloading quote PDF: ' + err.message);
    } finally {
      setDownloadingQuotePdf(false);
    }
  };

  if (!current || current.orderType !== 'Quote') return null;

  const counterOffers = current.counterOffers || [];

  return (
    <section
      aria-label="Quote details"
      style={{
        marginTop: '1.25rem',
        padding: '1rem',
        backgroundColor: '#111827',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--accent-amber)',
            textTransform: 'uppercase',
          }}
        >
          Quote
          {current.quoteVersion != null ? ` · Version ${current.quoteVersion}` : ''}
        </span>
        {(isOwnerBuyer || isStaff) && (
          <button
            type="button"
            onClick={handleDownloadQuotePdf}
            disabled={downloadingQuotePdf}
            className="btn btn-secondary btn-sm"
          >
            <FileDown size={14} />
            <span>{downloadingQuotePdf ? 'Downloading...' : 'Download Quote PDF'}</span>
          </button>
        )}
      </div>

      {current.quoteValidityDate && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Valid until{' '}
          <b style={{ color: '#FFFFFF' }}>{formatDate(current.quoteValidityDate)}</b>
        </p>
      )}

      {expired && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
            padding: '0.6rem 0.75rem',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-amber-light)',
            fontSize: '0.85rem',
          }}
        >
          <AlertTriangle size={16} />
          <span>
            This quote has expired — it was valid until{' '}
            {current.quoteValidityDate ? formatDate(current.quoteValidityDate) : 'the date above'}.
            Counter-offers and quote responses are disabled.
          </span>
        </div>
      )}

      {/* Counter-offer thread */}
      <div style={{ marginTop: '1rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>
          Counter-offers
        </span>
        {counterOffers.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            No counter-offers yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
            {counterOffers.map((offer, idx) => {
              const offerId = offer._id ?? offer.id;
              const isPending = (offer.status || '').toLowerCase() === 'pending';
              return (
                <div
                  key={offerId ?? idx}
                  style={{
                    padding: '0.6rem 0.75rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <b style={{ color: 'var(--accent-amber)', fontSize: '0.95rem' }}>
                      ${Number(offer.amount)?.toFixed(2)} USD
                    </b>
                    <CounterOfferStatusBadge status={offer.status} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {offer.byRole === 'admin' || offer.byRole === 'staff'
                        ? 'Staff'
                        : 'Buyer'}
                      {offer.createdAt ? ` · ${formatDate(offer.createdAt)}` : ''}
                    </span>
                  </div>
                  {offer.message && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      {offer.message}
                    </p>
                  )}
                  {isStaff && isPending && offerId && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={anyPending}
                        onClick={() =>
                          respondMutation.mutate({ offerId, accept: true })
                        }
                      >
                        <CheckCircle2 size={14} />
                        <span>Accept Offer</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={anyPending}
                        onClick={() =>
                          respondMutation.mutate({ offerId, accept: false })
                        }
                      >
                        <XCircle size={14} />
                        <span>Decline Offer</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {actionError && (
        <p role="alert" style={{ color: 'var(--accent-rose, #fb7185)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {actionError}
        </p>
      )}

      {/* Buyer actions */}
      {isOwnerBuyer && (
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <form onSubmit={handleCounterOfferSubmit}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>
              Make a counter-offer
            </span>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                style={{ maxWidth: '180px' }}
                placeholder="Amount (USD)"
                aria-label="Counter-offer amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!canActAsBuyer || anyPending}
              />
              <input
                type="text"
                className="form-control"
                style={{ flex: '1 1 220px' }}
                placeholder="Message (optional)"
                aria-label="Counter-offer message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={!canActAsBuyer || anyPending}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!canActAsBuyer || anyPending}
              >
                <Send size={14} />
                <span>Send Counter-offer</span>
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!canActAsBuyer || anyPending}
              onClick={() => {
                setActionError(null);
                acceptMutation.mutate();
              }}
            >
              <CheckCircle2 size={14} />
              <span>Accept Quote</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={!canActAsBuyer || anyPending}
              onClick={() => setShowDecline((v) => !v)}
            >
              <XCircle size={14} />
              <span>Decline Quote</span>
            </button>
          </div>

          {showDecline && (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: '1 1 220px' }}
                placeholder="Reason for declining (optional)"
                aria-label="Decline reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                disabled={!canActAsBuyer || anyPending}
              />
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={!canActAsBuyer || anyPending}
                onClick={() => declineMutation.mutate(declineReason.trim() || undefined)}
              >
                Confirm Decline
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
