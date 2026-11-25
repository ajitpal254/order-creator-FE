// Buyer-dashboard API calls that do not exist on src/api/client.js
// (FE-13). Built on the exported apiRequest so auth/refresh behaviour is
// identical to the rest of the app. client.js itself is unchanged.
//
// Why this exists: orderApi.getMyOrders() calls GET /orders/my-orders with
// no query params, and the backend EXCLUDES Draft orders from that
// response unless ?includeDrafts=true is passed. The buyer dashboard
// needs the drafts (its "Awaiting your action" section), so it fetches
// the same endpoint with drafts included.
import { apiRequest } from './client';

export const buyerOrdersApi = {
  getMyOrdersIncludingDrafts: () =>
    apiRequest('/orders/my-orders?includeDrafts=true'),

  // Reorder (v0.5 F3): POST /api/orders/:id/reorder asks the backend to
  // clone a past order into a NEW Draft order and returns it. This is
  // distinct from the buyer dashboard's client-side "Order again" clone
  // (which builds a create payload itself) — here the server owns the
  // copy, so the client sends nothing but the order id.
  reorderOrder: (id) =>
    apiRequest(`/orders/${id}/reorder`, { method: 'POST' }),
};
