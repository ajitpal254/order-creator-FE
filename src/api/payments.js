import { apiRequest } from './client';

// Payments API (v0.6 F2). Backend contract:
//   POST /api/payments/request            { orderId, amount, method }
//        method 'card'          -> { payment, checkoutUrl? }
//        method 'bank_transfer' -> { payment, instructions }
//        card with no gateway configured -> HTTP 503, body code
//        'PAYMENTS_NOT_CONFIGURED' (the caller falls back to bank transfer)
//   POST /api/payments/:id/proof          multipart, form field 'file'
//   POST /api/payments/:id/confirm        (staff only)
//   POST /api/payments/:id/reject         { reason } (staff only)
//   GET  /api/payments/order/:orderId     -> payments list
// Payment object: { id|_id, amount, currency, method, status, createdAt }.
// Amounts always come from API fields — nothing is computed client-side.

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const paymentsApi = {
  requestPayment: ({ orderId, amount, method }) =>
    apiRequest('/payments/request', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount, method }),
    }),

  getOrderPayments: (orderId) => apiRequest(`/payments/order/${orderId}`),

  confirmPayment: (paymentId) =>
    apiRequest(`/payments/${paymentId}/confirm`, { method: 'POST' }),

  rejectPayment: (paymentId, reason) =>
    apiRequest(`/payments/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Proof upload needs progress events, which fetch cannot report — so
  // this uses XMLHttpRequest, mirroring client.js's auth approach (the
  // access token from localStorage 'hao_token' as a Bearer header; the
  // token never travels in the URL).
  uploadProof: (paymentId, file, onProgress) =>
    new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/payments/${paymentId}/proof`);
      xhr.withCredentials = true;

      const token = localStorage.getItem('hao_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (typeof onProgress === 'function' && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        let data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = xhr.responseText || null;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
          return;
        }
        const err = new Error(
          (data && typeof data === 'object' && data.message) ||
            'Failed to upload payment proof'
        );
        err.status = xhr.status;
        err.data = data;
        reject(err);
      };
      xhr.onerror = () => reject(new Error('Failed to upload payment proof'));
      xhr.onabort = () => reject(new Error('Payment proof upload was cancelled'));

      xhr.send(formData);
    }),
};

// Stable TanStack Query key for an order's payments list.
export const paymentKeys = {
  order: (orderId) => ['payments', 'order', orderId],
};

// Normalises the list endpoint's envelope: accepts a bare array or
// { data: [...] } / { payments: [...] } wrappers.
export const extractPayments = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.payments)) return res.payments;
  if (Array.isArray(res?.data?.payments)) return res.data.payments;
  return [];
};

export const paymentIdOf = (payment) => payment?.id ?? payment?._id ?? null;
