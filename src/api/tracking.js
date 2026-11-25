import { apiRequest } from './client';

// Tracking API (v0.6 F2). Backend contract:
//   GET /api/orders/:id/tracking-link  (authenticated)
//        -> { url, token, expiresAt }
//   GET /api/track/:token              (PUBLIC, no auth)
//        -> { orderNumber, status, timeline[], carrier?, trackingNumber? }

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const trackingApi = {
  getTrackingLink: (orderId) => apiRequest(`/orders/${orderId}/tracking-link`),

  // Public tracking lookup: plain fetch with NO Authorization header and
  // NO credentials — the token in the URL is the only credential, and a
  // signed-in session must never leak to this endpoint.
  getPublicTracking: async (token) => {
    const response = await fetch(`${API_BASE}/track/${encodeURIComponent(token)}`);
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      const err = new Error(
        (data && typeof data === 'object' && data.message) || 'Request failed'
      );
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  },
};

// Orders in these statuses have left the building, so a tracking link is
// meaningful. The app's pipeline calls the shipped state 'Dispatched'
// (see StatusBadge / OrderStatusModal); 'Shipped' is accepted for the
// same state under the backend's wording.
export const isShippedOrder = (order) =>
  order?.status === 'Dispatched' || order?.status === 'Shipped';
