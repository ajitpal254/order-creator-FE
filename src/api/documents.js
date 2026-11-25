import { apiRequest } from './client';

// Order documents API (v0.8 F1 — FEAT-08, order documents vault).
// Backend contract:
//   GET    /api/orders/:id/documents              -> [{ id|_id, type, title,
//                                                     version, generatedFrom,
//                                                     createdAt }] (a bare array
//                                                     or a { data: [...] } envelope)
//   POST   /api/orders/:id/documents/generate     { type } where type is one of
//          packing_list | export_commercial_invoice | certificate_of_origin |
//          shipping_labels
//   GET    /api/orders/:id/documents/:docId/download   (binary blob)
//   POST   /api/orders/:id/documents/upload       multipart FormData, file
//                                                 field 'file' + 'title' field
//   DELETE /api/orders/:id/documents/:docId       (staff only)
// Document fields are displayed exactly as the API returns them — nothing
// is computed client-side. These are NEW order documents, unrelated to the
// invoice components / invoice PDF flow (orderApi.downloadPdf is untouched).

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// Filename for a download: derived from the document's title (falling back
// to its type), with anything unsafe for a filename stripped out.
const sanitiseFilename = (doc) => {
  const raw = doc?.title || doc?.type || 'Document';
  const cleaned = String(raw)
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Document';
};

export const documentsApi = {
  listDocuments: (orderId) => apiRequest(`/orders/${orderId}/documents`),

  generateDocument: (orderId, type) =>
    apiRequest(`/orders/${orderId}/documents/generate`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

  // Upload needs progress events, which fetch cannot report — so this
  // uses XMLHttpRequest, mirroring paymentsApi.uploadProof (the access
  // token from localStorage 'hao_token' as a Bearer header; the token
  // never travels in the URL).
  uploadDocument: (orderId, file, title, onProgress) =>
    new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/orders/${orderId}/documents/upload`);
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
            'Failed to upload document'
        );
        err.status = xhr.status;
        err.data = data;
        reject(err);
      };
      xhr.onerror = () => reject(new Error('Failed to upload document'));
      xhr.onabort = () => reject(new Error('Document upload was cancelled'));

      xhr.send(formData);
    }),

  // Mirrors orderApi.downloadPdf in client.js exactly (authenticated fetch
  // -> blob object URL -> temporary anchor click -> revoke; the token
  // never travels in the URL). The invoice PDF flow itself is untouched.
  downloadDocument: async (orderId, doc) => {
    const docId = documentIdOf(doc);
    const token = localStorage.getItem('hao_token');
    const response = await fetch(
      `${API_BASE}/orders/${orderId}/documents/${docId}/download`,
      {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.message || 'Failed to download document');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitiseFilename(doc);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  deleteDocument: (orderId, docId) =>
    apiRequest(`/orders/${orderId}/documents/${docId}`, { method: 'DELETE' }),
};

// Stable TanStack Query key for an order's documents list.
export const documentKeys = {
  order: (orderId) => ['documents', 'order', orderId],
};

// Normalises the list endpoint's envelope: accepts a bare array or a
// { data: [...] } wrapper.
export const extractDocuments = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.documents)) return res.data.documents;
  if (Array.isArray(res?.documents)) return res.documents;
  return [];
};

export const documentIdOf = (doc) => doc?.id ?? doc?._id ?? null;
