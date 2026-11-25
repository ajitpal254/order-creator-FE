import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Upload,
  XCircle,
} from 'lucide-react';
import { extractPayments, paymentIdOf, paymentKeys, paymentsApi } from '../../api/payments';
import { redirectTo } from '../../lib/redirect';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../Modal';
import './payments.css';

// Payments panel (v0.6 F2) for one order. Rendered inside the expanded
// order on the buyer's My Orders page and inside the staff order-status
// modal.
//
// Amounts come ONLY from API fields: the amount input defaults to
// order.balanceDue when the API provides it, else order.totalAmount.
// No totals or tax are ever computed here.
//
// Buyer flow:
//  - Card: POST /payments/request -> redirect to the returned
//    checkoutUrl. If the gateway is not configured (503 with code
//    PAYMENTS_NOT_CONFIGURED) the panel falls back to the bank-transfer
//    path automatically, with a short note.
//  - Bank transfer: POST /payments/request -> the returned instructions
//    are shown verbatim, followed by a proof upload (progress bar).
// Staff flow: the payments list shows Confirm / Reject actions for
// payments in 'proof_submitted' status; Reject asks for a reason.

const paymentStatusBadgeClass = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'confirmed':
    case 'completed':
    case 'paid':
    case 'succeeded':
      return 'badge-emerald';
    case 'rejected':
    case 'failed':
    case 'cancelled':
      return 'badge-rose';
    case 'proof_submitted':
    case 'pending':
    case 'awaiting_proof':
    case 'processing':
      return 'badge-amber';
    default:
      return 'badge-slate';
  }
};

export const PaymentStatusBadge = ({ status }) => (
  <span className={`badge ${paymentStatusBadgeClass(status)}`}>{status}</span>
);

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const isPaymentsNotConfigured = (err) =>
  err?.status === 503 &&
  (err?.data?.code === 'PAYMENTS_NOT_CONFIGURED' || err?.code === 'PAYMENTS_NOT_CONFIGURED');

export const PayPanel = ({ order, staff = false }) => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const orderId = order?._id ?? order?.id;

  // Staff mode: explicit prop (admin hosts) or the signed-in user is
  // staff, following the AuthContext pattern used by QuotePanel.
  const isStaff =
    staff || Boolean(isAdmin) || user?.role === 'admin' || user?.role === 'staff';

  const balanceDue = order?.balanceDue ?? order?.totalAmount ?? null;

  const [amount, setAmount] = useState(balanceDue != null ? String(balanceDue) : '');
  const [method, setMethod] = useState('card');
  const [cardUnavailable, setCardUnavailable] = useState(false);
  const [instructions, setInstructions] = useState(null);
  const [bankPayment, setBankPayment] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofProgress, setProofProgress] = useState(null);
  const [proofStatus, setProofStatus] = useState(null); // { kind, message }
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const fileInputRef = useRef(null);

  // Keep the amount in step with the API-provided balance when the host
  // swaps in a different order.
  useEffect(() => {
    setAmount(balanceDue != null ? String(balanceDue) : '');
    setInstructions(null);
    setBankPayment(null);
    setCardUnavailable(false);
    setProofFile(null);
    setProofProgress(null);
    setProofStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useQuery({
    queryKey: paymentKeys.order(orderId),
    queryFn: () => paymentsApi.getOrderPayments(orderId),
    enabled: Boolean(orderId),
  });
  const payments = extractPayments(paymentsData);

  const refreshPayments = () =>
    queryClient.invalidateQueries({ queryKey: paymentKeys.order(orderId) });

  const applyRequestResult = (res, requestedMethod) => {
    const payload = res?.data ?? res ?? {};
    const payment = payload.payment ?? null;
    if (requestedMethod === 'card' && payload.checkoutUrl) {
      redirectTo(payload.checkoutUrl);
      return;
    }
    if (requestedMethod === 'bank_transfer') {
      setBankPayment(payment);
      setInstructions(payload.instructions ?? payment?.instructions ?? null);
    }
    refreshPayments();
  };

  const requestMutation = useMutation({
    mutationFn: (requestedMethod) =>
      paymentsApi.requestPayment({
        orderId,
        amount: Number(amount),
        method: requestedMethod,
      }),
    onSuccess: (res, requestedMethod) => applyRequestResult(res, requestedMethod),
    onError: (err, requestedMethod) => {
      // Card gateway not configured yet: fall back to bank transfer —
      // request it right away so the buyer lands on the instructions +
      // proof-upload path with a short explanatory note.
      if (requestedMethod === 'card' && isPaymentsNotConfigured(err)) {
        setCardUnavailable(true);
        setMethod('bank_transfer');
        setActionError(null);
        requestMutation.mutate('bank_transfer');
        return;
      }
      setActionError(err.message || 'Payment request failed');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (paymentId) => paymentsApi.confirmPayment(paymentId),
    onSuccess: refreshPayments,
    onError: (err) => setActionError(err.message || 'Could not confirm payment'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ paymentId, reason }) => paymentsApi.rejectPayment(paymentId, reason),
    onSuccess: () => {
      setRejectTarget(null);
      setRejectReason('');
      refreshPayments();
    },
    onError: (err) => setActionError(err.message || 'Could not reject payment'),
  });

  const anyPending =
    requestMutation.isPending || confirmMutation.isPending || rejectMutation.isPending;

  const handlePaySubmit = (e) => {
    e.preventDefault();
    setActionError(null);
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setActionError('Enter a valid payment amount.');
      return;
    }
    requestMutation.mutate(method);
  };

  const handleProofUpload = async () => {
    const targetId = paymentIdOf(bankPayment);
    if (!proofFile) {
      setProofStatus({ kind: 'error', message: 'Choose a proof file first.' });
      return;
    }
    if (!targetId) {
      setProofStatus({
        kind: 'error',
        message: 'Request a bank transfer first so the proof can be attached to its payment.',
      });
      return;
    }
    setProofStatus(null);
    setProofProgress(0);
    try {
      await paymentsApi.uploadProof(targetId, proofFile, setProofProgress);
      setProofStatus({ kind: 'success', message: 'Payment proof uploaded.' });
      setProofFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshPayments();
    } catch (err) {
      setProofStatus({
        kind: 'error',
        message: err.message || 'Failed to upload payment proof',
      });
    } finally {
      setProofProgress(null);
    }
  };

  if (!order || !orderId) return null;

  return (
    <section aria-label="Payments" className="pay-panel">
      <span className="pay-panel-title">Payments</span>

      {balanceDue != null && (
        <p className="pay-panel-balance">
          Balance due: <b>${Number(balanceDue).toFixed(2)} USD</b>
          {order.paymentStatus ? ` · Payment status: ${order.paymentStatus}` : ''}
        </p>
      )}

      {cardUnavailable && (
        <div role="note" className="pay-panel-note">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            Card payments aren&apos;t available yet — please pay by bank transfer instead.
          </span>
        </div>
      )}

      {/* Buyer payment form (staff confirm/reject from the list below) */}
      {!isStaff && (
        <form onSubmit={handlePaySubmit} className="pay-panel-form">
          <div className="pay-panel-field">
            <label htmlFor={`pay-amount-${orderId}`}>Amount (USD)</label>
            <input
              id={`pay-amount-${orderId}`}
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              style={{ maxWidth: '180px' }}
              aria-label="Payment amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={anyPending}
            />
          </div>
          <div className="pay-panel-field">
            <label htmlFor={`pay-method-${orderId}`}>Method</label>
            <select
              id={`pay-method-${orderId}`}
              className="form-control form-select"
              style={{ maxWidth: '200px' }}
              aria-label="Payment method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={anyPending}
            >
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={anyPending}>
            {method === 'card' ? <CreditCard size={14} /> : <Landmark size={14} />}
            <span>{requestMutation.isPending ? 'Processing...' : 'Pay'}</span>
          </button>
        </form>
      )}

      {/* Bank-transfer instructions (verbatim from the API) + proof upload */}
      {instructions && (
        <div>
          <div className="pay-instructions" aria-label="Bank transfer instructions">
            {instructions}
          </div>
          {!isStaff && (
            <div className="pay-proof">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>
                Upload payment proof
              </span>
              <div className="pay-proof-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="Payment proof file"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleProofUpload}
                  disabled={proofProgress != null}
                >
                  <Upload size={14} />
                  <span>{proofProgress != null ? 'Uploading...' : 'Upload Proof'}</span>
                </button>
              </div>
              {proofProgress != null && (
                <div
                  className="pay-progress"
                  role="progressbar"
                  aria-valuenow={proofProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Proof upload progress"
                >
                  <div className="pay-progress-bar" style={{ width: `${proofProgress}%` }} />
                </div>
              )}
              {proofStatus?.kind === 'success' && (
                <p className="pay-panel-success" role="status">
                  {proofStatus.message}
                </p>
              )}
              {proofStatus?.kind === 'error' && (
                <p className="pay-panel-error" role="alert">
                  {proofStatus.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {actionError && (
        <p role="alert" className="pay-panel-error">
          {actionError}
        </p>
      )}

      {/* Payments list */}
      <div className="pay-list">
        <span className="pay-list-title">Payment history</span>
        {paymentsLoading ? (
          <p className="pay-list-empty">Loading payments…</p>
        ) : paymentsError ? (
          <p className="pay-list-empty">Could not load payments for this order.</p>
        ) : payments.length === 0 ? (
          <p className="pay-list-empty">No payments yet.</p>
        ) : (
          payments.map((payment, idx) => {
            const paymentId = paymentIdOf(payment);
            const needsReview =
              isStaff && (payment.status || '').toLowerCase() === 'proof_submitted';
            return (
              <div key={paymentId ?? idx} className="pay-row">
                <div className="pay-row-top">
                  <span className="pay-row-amount">
                    ${Number(payment.amount).toFixed(2)} {payment.currency || 'USD'}
                  </span>
                  <PaymentStatusBadge status={payment.status} />
                  <span className="pay-row-meta">
                    {payment.method === 'bank_transfer' ? 'Bank transfer' : 'Card'}
                    {payment.createdAt ? ` · ${formatDate(payment.createdAt)}` : ''}
                  </span>
                </div>
                {needsReview && paymentId && (
                  <div className="pay-row-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={anyPending}
                      onClick={() => {
                        setActionError(null);
                        confirmMutation.mutate(paymentId);
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Confirm Payment</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={anyPending}
                      onClick={() => {
                        setRejectTarget(payment);
                        setRejectReason('');
                      }}
                    >
                      <XCircle size={14} />
                      <span>Reject Payment</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Staff reject dialog */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject Payment"
        maxWidth="480px"
      >
        <div className="form-group">
          <label className="form-label" htmlFor="reject-payment-reason">
            Reason for rejection
          </label>
          <textarea
            id="reject-payment-reason"
            rows={3}
            className="form-control"
            aria-label="Rejection reason"
            placeholder="e.g. Proof does not match the transferred amount."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setRejectTarget(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={rejectMutation.isPending}
            onClick={() =>
              rejectMutation.mutate({
                paymentId: paymentIdOf(rejectTarget),
                reason: rejectReason.trim(),
              })
            }
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
          </button>
        </div>
      </Modal>
    </section>
  );
};
