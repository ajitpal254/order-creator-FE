import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  KeyRound,
  Plus,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  API_KEY_SCOPES,
  WEBHOOK_EVENTS,
  getDeveloperId,
} from '../../api/developer';
import {
  useApiKeys,
  useCreateApiKey,
  useCreateWebhook,
  useDeleteWebhook,
  useRevokeApiKey,
  useWebhookDeliveries,
  useWebhooks,
} from '../../hooks/useDeveloper';
import { Modal } from '../../components/Modal';
import { formatDate, formatDateTime } from '../../i18n/format';

// Developer settings (v1.0 F1): per-user API keys + webhook subscriptions.
// Plaintext keys and webhook signing secrets are returned by the API ONCE
// at creation; they live only in this component's state, are shown in a
// prominent callout, and are cleared on dismiss or unmount (navigation) —
// they are never stored anywhere else.
// Follows the CompaniesSection glass-card + banner pattern.

const errorBannerStyle = {
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
};

const successBannerStyle = {
  ...errorBannerStyle,
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  border: '1px solid rgba(34, 197, 94, 0.35)',
  color: '#4ADE80',
};

const rowStyle = {
  backgroundColor: '#111827',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '0.85rem 1rem',
};

const secretBoxStyle = {
  userSelect: 'all',
  wordBreak: 'break-all',
  backgroundColor: 'var(--bg-surface, #0F172A)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '0.75rem',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  color: '#FFFFFF',
};

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: 'var(--text-secondary)',
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const EXAMPLE_PAYLOAD = `{
  "id": "evt_9f2c1a",
  "event": "order.created",
  "createdAt": "2026-11-25T14:30:00.000Z",
  "data": {
    "orderId": "665f1c2ab3d4e5f60718293a",
    "orderNumber": "HAO-2026-100042",
    "status": "submitted",
    "totalAmount": 1250.5,
    "currency": "USD"
  }
}`;

// One-time secret callout: shows a plaintext key / signing secret exactly
// once, with a copy button and a dismiss that clears it from state.
const OneTimeSecretCallout = ({ label, value, onDismiss }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="alert"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.45)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        marginBottom: '1.25rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <p style={{ color: '#FBBF24', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {label}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <X size={18} />
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        Copy it now and store it somewhere safe. You won&apos;t see this again.
      </p>
      <div style={{ ...secretBoxStyle, marginBottom: '0.75rem' }}>{value}</div>
      <button
        type="button"
        onClick={handleCopy}
        className="btn btn-secondary btn-sm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Copy size={14} />
        <span>{copied ? 'Copied!' : 'Copy'}</span>
      </button>
    </div>
  );
};

// Delivery log for one subscription, fetched only while expanded.
const DeliveriesList = ({ webhookId }) => {
  const deliveriesQuery = useWebhookDeliveries(webhookId, true);
  const deliveries = deliveriesQuery.data || [];

  if (deliveriesQuery.isLoading) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Loading deliveries…
      </p>
    );
  }
  if (deliveriesQuery.isError) {
    return (
      <p style={{ color: '#F87171', fontSize: '0.85rem' }}>
        {deliveriesQuery.error?.message || 'Failed to load deliveries.'}
      </p>
    );
  }
  if (deliveries.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No deliveries yet for this subscription.
      </p>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {deliveries.map((delivery, index) => (
        <div
          key={delivery.id || delivery._id || index}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.85rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--bg-surface, #0F172A)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <b style={{ color: '#FFFFFF' }}>{delivery.event}</b>
          <span style={{ color: 'var(--text-secondary)' }}>
            Status: {delivery.status}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Attempts: {delivery.attempts}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            HTTP {delivery.lastStatusCode ?? '—'}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {delivery.createdAt ? formatDateTime(delivery.createdAt) : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export const DeveloperSection = () => {
  const { t } = useTranslation();

  const keysQuery = useApiKeys();
  const apiKeys = keysQuery.data || [];
  const webhooksQuery = useWebhooks();
  const webhooks = webhooksQuery.data || [];

  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // One-time secrets (plaintext key / webhook signing secret). Held only
  // in local state; cleared on dismiss and on unmount (navigation away).
  const [newKeySecret, setNewKeySecret] = useState(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState(null);
  useEffect(
    () => () => {
      setNewKeySecret(null);
      setNewWebhookSecret(null);
    },
    []
  );

  // API key create form.
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState([]);
  const toggleScope = (scope) =>
    setKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );

  // Revoke confirmation (shared Modal).
  const [keyToRevoke, setKeyToRevoke] = useState(null);

  // Webhook create form.
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState([]);
  const toggleEvent = (event) =>
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );

  // Which subscriptions have their delivery log expanded.
  const [expandedDeliveries, setExpandedDeliveries] = useState({});
  const toggleDeliveries = (id) =>
    setExpandedDeliveries((prev) => ({ ...prev, [id]: !prev[id] }));

  const fail = (err, fallback) => setError(err?.message || fallback);

  const handleCreateKey = (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    createKey.mutate(
      { name: keyName.trim(), scopes: keyScopes },
      {
        onSuccess: (created) => {
          setKeyName('');
          setKeyScopes([]);
          if (created?.key) setNewKeySecret(created.key);
          setMessage('API key created.');
        },
        onError: (err) => fail(err, 'Could not create the API key.'),
      }
    );
  };

  const handleRevokeKey = () => {
    if (!keyToRevoke) return;
    const id = getDeveloperId(keyToRevoke);
    setError(null);
    setMessage(null);
    revokeKey.mutate(id, {
      onSuccess: () => {
        setKeyToRevoke(null);
        setMessage('API key revoked.');
      },
      onError: (err) => {
        setKeyToRevoke(null);
        fail(err, 'Could not revoke that API key.');
      },
    });
  };

  const handleCreateWebhook = (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    createWebhook.mutate(
      { url: webhookUrl.trim(), events: webhookEvents },
      {
        onSuccess: (created) => {
          setWebhookUrl('');
          setWebhookEvents([]);
          if (created?.secret) setNewWebhookSecret(created.secret);
          setMessage('Webhook subscription created.');
        },
        onError: (err) => fail(err, 'Could not create the webhook subscription.'),
      }
    );
  };

  const handleDeleteWebhook = (webhook) => {
    setError(null);
    setMessage(null);
    deleteWebhook.mutate(getDeveloperId(webhook), {
      onSuccess: () => setMessage('Webhook subscription deleted.'),
      onError: (err) => fail(err, 'Could not delete that webhook subscription.'),
    });
  };

  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
      <h3
        style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <KeyRound size={18} />
        {t('settings.developerTitle')}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Integrate your own systems with H.A. Overseas: create API keys for
        programmatic access and webhook subscriptions for order events.
        Keys and subscriptions belong to your account only.
      </p>

      {error && (
        <div style={errorBannerStyle} role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div style={successBannerStyle}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{message}</span>
        </div>
      )}

      {/* ---- How it works (static docs blurb) ---- */}
      <div
        style={{
          ...rowStyle,
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <p style={{ marginBottom: '0.5rem' }}>
          <b style={{ color: '#FFFFFF' }}>Authenticate</b> by sending your API
          key on every request in the <code>X-API-Key</code> header:
        </p>
        <pre style={{ ...secretBoxStyle, marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
          {'X-API-Key: hao_live_…'}
        </pre>
        <p style={{ marginBottom: '0.5rem' }}>
          <b style={{ color: '#FFFFFF' }}>Verify webhooks:</b> each delivery is
          signed with your subscription&apos;s signing secret. The signature
          arrives in the <code>X-HAO-Signature</code> header as an HMAC-SHA256
          hex digest of the raw request body — recompute it and compare
          before trusting the payload.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <b style={{ color: '#FFFFFF' }}>Example webhook payload:</b>
        </p>
        <pre style={{ ...secretBoxStyle, whiteSpace: 'pre-wrap', margin: 0 }}>
          {EXAMPLE_PAYLOAD}
        </pre>
      </div>

      {/* ---- API keys ---- */}
      <h4
        style={{
          color: '#FFFFFF',
          fontSize: '1rem',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <KeyRound size={16} />
        API keys
      </h4>

      {newKeySecret && (
        <OneTimeSecretCallout
          label="Your new API key"
          value={newKeySecret}
          onDismiss={() => setNewKeySecret(null)}
        />
      )}

      <form onSubmit={handleCreateKey} style={{ marginBottom: '1.25rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="developer-key-name">
            Key name
          </label>
          <input
            id="developer-key-name"
            type="text"
            className="form-control"
            placeholder="e.g. Warehouse integration"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            required
          />
        </div>
        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1rem' }}>
          <legend className="form-label" style={{ marginBottom: '0.5rem' }}>
            Scopes
          </legend>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {API_KEY_SCOPES.map((scope) => (
              <label key={scope} style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={keyScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                {scope}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createKey.isPending || !keyName.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          <span>{createKey.isPending ? 'Creating...' : 'Create API key'}</span>
        </button>
      </form>

      {keysQuery.isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Loading API keys…
        </p>
      ) : keysQuery.isError ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: '#F87171', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {keysQuery.error?.message || 'Failed to load API keys.'}
          </p>
          <button type="button" onClick={() => keysQuery.refetch()} className="btn btn-secondary btn-sm">
            Try Again
          </button>
        </div>
      ) : apiKeys.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          No API keys yet. Create one above to get started.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {apiKeys.map((apiKey) => {
            const id = getDeveloperId(apiKey);
            return (
              <div
                key={id}
                style={{
                  ...rowStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <b style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>{apiKey.name}</b>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>
                    Prefix: <span style={{ fontFamily: 'monospace' }}>{apiKey.prefix}</span>
                    {' · '}Created {apiKey.createdAt ? formatDate(apiKey.createdAt) : '—'}
                    {' · '}Last used{' '}
                    {apiKey.lastUsedAt ? formatDateTime(apiKey.lastUsedAt) : 'Never'}
                  </span>
                  {Array.isArray(apiKey.scopes) && apiKey.scopes.length > 0 && (
                    <span style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                      {apiKey.scopes.map((scope) => (
                        <span key={scope} className="badge badge-slate">
                          {scope}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={revokeKey.isPending}
                  onClick={() => setKeyToRevoke(apiKey)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Trash2 size={14} />
                  <span>Revoke</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Webhooks ---- */}
      <h4
        style={{
          color: '#FFFFFF',
          fontSize: '1rem',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Webhook size={16} />
        Webhooks
      </h4>

      {newWebhookSecret && (
        <OneTimeSecretCallout
          label="Your webhook signing secret"
          value={newWebhookSecret}
          onDismiss={() => setNewWebhookSecret(null)}
        />
      )}

      <form onSubmit={handleCreateWebhook} style={{ marginBottom: '1.25rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="developer-webhook-url">
            Webhook URL
          </label>
          <input
            id="developer-webhook-url"
            type="url"
            className="form-control"
            placeholder="https://example.com/hooks/ha-overseas"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            required
          />
        </div>
        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1rem' }}>
          <legend className="form-label" style={{ marginBottom: '0.5rem' }}>
            Events
          </legend>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {WEBHOOK_EVENTS.map((event) => (
              <label key={event} style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={webhookEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                />
                {event}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createWebhook.isPending || !webhookUrl.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          <span>{createWebhook.isPending ? 'Adding...' : 'Add webhook'}</span>
        </button>
      </form>

      {webhooksQuery.isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading webhooks…</p>
      ) : webhooksQuery.isError ? (
        <div>
          <p style={{ color: '#F87171', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {webhooksQuery.error?.message || 'Failed to load webhooks.'}
          </p>
          <button type="button" onClick={() => webhooksQuery.refetch()} className="btn btn-secondary btn-sm">
            Try Again
          </button>
        </div>
      ) : webhooks.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No webhook subscriptions yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {webhooks.map((webhook) => {
            const id = getDeveloperId(webhook);
            const expanded = Boolean(expandedDeliveries[id]);
            return (
              <div key={id} style={rowStyle}>
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
                    <b
                      style={{
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                      }}
                    >
                      {webhook.url}
                    </b>
                    <span style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem', alignItems: 'center' }}>
                      <span className={`badge ${webhook.active ? 'badge-emerald' : 'badge-slate'}`}>
                        {webhook.active ? 'Active' : 'Inactive'}
                      </span>
                      {Array.isArray(webhook.events) &&
                        webhook.events.map((event) => (
                          <span key={event} className="badge badge-slate">
                            {event}
                          </span>
                        ))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleDeliveries(id)}
                      aria-expanded={expanded}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>Deliveries</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={deleteWebhook.isPending}
                      onClick={() => handleDeleteWebhook(webhook)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <DeliveriesList webhookId={id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Revoke confirmation */}
      <Modal
        isOpen={Boolean(keyToRevoke)}
        onClose={() => setKeyToRevoke(null)}
        title="Revoke API key"
        maxWidth="440px"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Revoke the key{' '}
          <b style={{ color: '#FFFFFF' }}>{keyToRevoke?.name}</b> (
          <span style={{ fontFamily: 'monospace' }}>{keyToRevoke?.prefix}</span>)?
          Anything using this key will stop working immediately. This cannot
          be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-danger"
            disabled={revokeKey.isPending}
            onClick={handleRevokeKey}
          >
            {revokeKey.isPending ? 'Revoking...' : 'Revoke key'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setKeyToRevoke(null)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DeveloperSection;
