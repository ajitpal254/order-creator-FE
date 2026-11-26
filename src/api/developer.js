import { apiRequest } from './client';

// Developer API (v1.0 F1 — API keys + webhooks).
// Backend contract:
//   POST   /api/developer/keys                    { name, scopes[] }
//          -> { key (plaintext, returned ONCE), id, prefix }
//   GET    /api/developer/keys                    -> [{ id, name, prefix, scopes, lastUsedAt, createdAt }]
//   DELETE /api/developer/keys/:id
//   POST   /api/developer/webhooks                { url, events[] }
//          -> subscription { id, url, events, active, secret (returned ONCE at creation) }
//   GET    /api/developer/webhooks                -> [subscription...]
//   DELETE /api/developer/webhooks/:id
//   GET    /api/developer/webhooks/:id/deliveries -> [{ event, status, attempts, lastStatusCode, createdAt }]
// Responses may arrive in the shared { success, data } envelope or bare;
// the hooks normalise both. Keys are per-user: every call is scoped to the
// signed-in user by the backend.
export const developerApi = {
  createKey: ({ name, scopes }) =>
    apiRequest('/developer/keys', {
      method: 'POST',
      body: JSON.stringify({ name, scopes }),
    }),
  listKeys: () => apiRequest('/developer/keys'),
  revokeKey: (id) =>
    apiRequest(`/developer/keys/${id}`, { method: 'DELETE' }),
  createWebhook: ({ url, events }) =>
    apiRequest('/developer/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, events }),
    }),
  listWebhooks: () => apiRequest('/developer/webhooks'),
  deleteWebhook: (id) =>
    apiRequest(`/developer/webhooks/${id}`, { method: 'DELETE' }),
  listDeliveries: (id) => apiRequest(`/developer/webhooks/${id}/deliveries`),
};

// Stable TanStack Query keys for developer data.
export const developerKeys = {
  all: ['developer'],
  apiKeys: ['developer', 'keys'],
  webhooks: ['developer', 'webhooks'],
  deliveries: (id) => ['developer', 'webhooks', id, 'deliveries'],
};

// Scopes a key can be granted, in contract order.
export const API_KEY_SCOPES = ['products:read', 'orders:read', 'orders:write'];

// Webhook events a subscription can listen for, in contract order.
export const WEBHOOK_EVENTS = [
  'order.created',
  'order.status_changed',
  'order.confirmed',
  'payment.confirmed',
];

// Unwrap a { success, data } envelope (or a bare payload) to its data.
export const unwrapDeveloperData = (res) => res?.data ?? res;

// Normalise a list response (envelope or bare array) to an array.
export const asList = (res) => {
  const data = unwrapDeveloperData(res);
  return Array.isArray(data) ? data : [];
};

// A key/subscription id may arrive as `id` or `_id`.
export const getDeveloperId = (item) => item?.id || item?._id || null;
