import { apiRequest } from './client';

// Quote negotiation API (v0.5 F1 — quote UI).
// Applies to orders with orderType === 'Quote' only. Backend contract:
//   POST /api/orders/:id/counter-offer                    { amount, message }
//   POST /api/orders/:id/counter-offer/:offerId/respond   { accept: boolean }
//   POST /api/orders/:id/quote/accept
//   POST /api/orders/:id/quote/decline                    { reason? }
//   GET  /api/orders/:id/quote-pdf                        (PDF blob)
// Order objects carry quoteValidityDate, quoteVersion and
// counterOffers[] { _id, by, byRole, amount, message, status, createdAt }.
// Amounts are displayed exactly as the API returns them — no pricing is
// computed client-side.
export const quotesApi = {
  submitCounterOffer: (orderId, { amount, message }) =>
    apiRequest(`/orders/${orderId}/counter-offer`, {
      method: 'POST',
      body: JSON.stringify({ amount, message }),
    }),
  respondToCounterOffer: (orderId, offerId, accept) =>
    apiRequest(`/orders/${orderId}/counter-offer/${offerId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),
  acceptQuote: (orderId) =>
    apiRequest(`/orders/${orderId}/quote/accept`, { method: 'POST' }),
  declineQuote: (orderId, reason) =>
    apiRequest(`/orders/${orderId}/quote/decline`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  // Mirrors orderApi.downloadPdf in client.js exactly (authenticated fetch
  // -> blob object URL -> anchor download; the token never travels in the
  // URL). The invoice PDF flow itself is untouched.
  downloadQuotePdf: async (id, orderNumber = 'Document') => {
    const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
    const token = localStorage.getItem('hao_token');
    const response = await fetch(`${API_BASE}/orders/${id}/quote-pdf`, {
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.message || 'Failed to download quote PDF');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HAO_Quote_${orderNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// Stable TanStack Query keys for quote mutations' invalidation targets.
export const quoteKeys = {
  all: ['orders'],
};
