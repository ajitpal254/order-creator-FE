import React, { useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { isShippedOrder, trackingApi } from '../../api/tracking';

// "Share tracking link" button (v0.6 F2). Renders only for shipped
// (Dispatched) orders. On click it fetches a fresh public tracking link
// from GET /api/orders/:id/tracking-link, copies its `url` to the
// clipboard and shows a transient "Copied" confirmation.
export const ShareTrackingButton = ({ order }) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!isShippedOrder(order)) return null;

  const handleClick = async (e) => {
    e.stopPropagation();
    setFailed(false);
    try {
      setBusy(true);
      const res = await trackingApi.getTrackingLink(order._id ?? order.id);
      const payload = res?.data ?? res ?? {};
      const url = payload.url;
      if (!url) throw new Error('No tracking URL returned');
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="btn btn-secondary btn-sm"
      title="Copy a public tracking link for this order"
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      <span>{copied ? 'Copied' : failed ? 'Copy failed — retry' : 'Share tracking link'}</span>
    </button>
  );
};
