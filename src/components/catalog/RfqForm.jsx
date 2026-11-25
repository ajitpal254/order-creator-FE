import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Send, Trash2 } from 'lucide-react';
import { rfqApi } from '../../api/rfq';

// Public "Request a quote" form (v0.9 F3) for the catalog page. Usable
// WITHOUT an account: it POSTs to /api/public/rfq via src/api/rfq.js,
// which sends no Authorization header. Items are simple repeatable
// rows (product name + quantity). The `website` field is a honeypot:
// visually hidden, left empty by humans, submitted in the payload so
// the backend can drop bot submissions that fill it.
const emptyItem = () => ({ productName: '', quantity: '' });

export const RfqForm = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    website: '',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setItem = (index, key, value) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSent(false);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      message: form.message.trim(),
      items: items
        .filter((item) => item.productName.trim() !== '')
        .map((item) => ({
          productName: item.productName.trim(),
          quantity: item.quantity === '' ? '' : Number(item.quantity),
        })),
      website: form.website,
    };
    try {
      await rfqApi.submit(payload);
      setSent(true);
      setForm({ name: '', email: '', company: '', phone: '', message: '', website: '' });
      setItems([emptyItem()]);
    } catch (err) {
      setError(err.message || 'Could not send your quote request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ marginTop: '2.5rem', padding: '1.75rem' }}>
      <h2 style={{ fontSize: '1.4rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>
        Request a quote
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        No account needed — tell us what you need and our export desk will
        reply with a quote.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#F87171',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
      {sent && (
        <div
          role="status"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#4ADE80',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>Thank you — your quote request has been sent. We&apos;ll reply by email.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="rfq-name">Your name *</label>
            <input
              id="rfq-name"
              type="text"
              className="form-control"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="rfq-email">Email *</label>
            <input
              id="rfq-email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="rfq-company">Company *</label>
            <input
              id="rfq-company"
              type="text"
              className="form-control"
              value={form.company}
              onChange={(e) => setField('company', e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="rfq-phone">Phone (optional)</label>
            <input
              id="rfq-phone"
              type="tel"
              className="form-control"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </div>
        </div>

        {/* Honeypot: hidden from humans, filled by bots. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
          <label htmlFor="rfq-website">Website</label>
          <input
            id="rfq-website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setField('website', e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label" htmlFor="rfq-message">Message *</label>
          <textarea
            id="rfq-message"
            className="form-control"
            rows={4}
            value={form.message}
            onChange={(e) => setField('message', e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <span className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Items (optional)
          </span>
          {items.map((item, index) => (
            <div
              key={index}
              style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}
            >
              <input
                type="text"
                className="form-control"
                style={{ flex: '1 1 220px' }}
                placeholder="Product name"
                aria-label={`Item ${index + 1} product name`}
                value={item.productName}
                onChange={(e) => setItem(index, 'productName', e.target.value)}
              />
              <input
                type="number"
                min="1"
                className="form-control"
                style={{ width: '130px' }}
                placeholder="Qty"
                aria-label={`Item ${index + 1} quantity`}
                value={item.quantity}
                onChange={(e) => setItem(index, 'quantity', e.target.value)}
              />
              {items.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
          >
            <Plus size={14} />
            <span>Add item</span>
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Send size={16} />
          <span>{submitting ? 'Sending...' : 'Send quote request'}</span>
        </button>
      </form>
    </div>
  );
};

export default RfqForm;
