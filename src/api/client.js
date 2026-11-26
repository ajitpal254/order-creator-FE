// Production API base: set VITE_API_URL on Netlify to the deployed backend
// (e.g. https://<service>.onrender.com/api). In local dev it is unset and
// '/api' is served by the Vite dev proxy from the backend on :5000.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const getToken = () => localStorage.getItem('hao_token');

// Silent-refresh state: concurrent 401s share a single refresh instead of
// each firing their own. Waiters resolve with the fresh token (or reject
// when the session is dead).
let isRefreshing = false;
let refreshWaiters = [];

const resolveWaiters = (token) => {
  refreshWaiters.forEach(({ resolve }) => resolve(token));
  refreshWaiters = [];
};
const rejectWaiters = (err) => {
  refreshWaiters.forEach(({ reject }) => reject(err));
  refreshWaiters = [];
};

// Silent refresh using the httpOnly refresh-token cookie. Returns the fresh
// access token, or null when the session is dead — in which case the stale
// token is cleared so the app treats the user as logged out.
async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshWaiters.push({ resolve, reject });
    });
  }
  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) {
      rejectWaiters(new Error('Session expired'));
      localStorage.removeItem('hao_token');
      return null;
    }
    const data = await res.json().catch(() => null);
    const token = data?.accessToken || data?.token;
    if (!token) {
      rejectWaiters(new Error('Session expired'));
      localStorage.removeItem('hao_token');
      return null;
    }
    localStorage.setItem('hao_token', token);
    resolveWaiters(token);
    return token;
  } catch (err) {
    rejectWaiters(err);
    localStorage.removeItem('hao_token');
    return null;
  } finally {
    isRefreshing = false;
  }
}

// Auth endpoints never trigger a refresh: a 401 there means bad credentials,
// not an expired session.
const isAuthEndpoint = (endpoint) =>
  endpoint.startsWith('/auth/login') ||
  endpoint.startsWith('/auth/refresh') ||
  endpoint.startsWith('/auth/signup');

function parseResponseError(data, status) {
  let message = data?.message || (typeof data === 'string' ? data : 'Request failed');
  // Surface server-side validation details (e.g. Zod field errors).
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    message = `${message} — ${data.errors.map((e) => `${e.field || 'field'}: ${e.message}`).join(', ')}`;
  }
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
}

// Helper to make API requests with Authorization header.
// credentials: 'include' sends the refresh-token cookie cross-site in
// production (frontend on Netlify, API on Render). On a 401 it tries one
// silent refresh and retries the request once with the new token.
export async function apiRequest(endpoint, options = {}, _retried = false) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (response.status === 401 && !_retried && !isAuthEndpoint(endpoint)) {
    try {
      if (await refreshAccessToken()) return apiRequest(endpoint, options, true);
    } catch {
      // Refresh failed — fall through and report the original 401.
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) throw parseResponseError(data, response.status);

  return data;
}

// Multipart upload with real upload progress. fetch() exposes no upload
// progress events, so this uses XMLHttpRequest; otherwise it mirrors
// apiRequest exactly — same Authorization header, credentials, JSON
// parsing, error shape, and one silent-refresh retry on a 401.
// onProgress receives an integer percent (0–100), or null when the total
// size is not computable (callers render an indeterminate state then).
export function apiUpload(endpoint, formData, { onProgress } = {}, _retried = false) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${endpoint}`);
    xhr.withCredentials = true;
    const token = getToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.addEventListener('progress', (event) => {
        onProgress(
          event.lengthComputable && event.total > 0
            ? Math.min(100, Math.round((event.loaded / event.total) * 100))
            : null
        );
      });
    }
    xhr.addEventListener('load', async () => {
      const isJson = (xhr.getResponseHeader('content-type') || '').includes(
        'application/json'
      );
      let data = xhr.responseText;
      if (isJson) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = xhr.responseText;
        }
      }
      if (xhr.status === 401 && !_retried && !isAuthEndpoint(endpoint)) {
        try {
          if (await refreshAccessToken()) {
            resolve(apiUpload(endpoint, formData, { onProgress }, true));
            return;
          }
        } catch {
          // Refresh failed — fall through and report the original 401.
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(parseResponseError(data, xhr.status));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed — network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    xhr.send(formData);
  });
}

// API Service modules
export const authApi = {
  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  signup: (userData) =>
    apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  // Google sign-in: the body carries ONLY the Firebase ID token. The
  // backend verifies it and reads email/name/uid from the token itself —
  // client-supplied identity fields are not trusted (SEC-02).
  googleAuth: ({ idToken }) =>
    apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
  refreshToken: () => apiRequest('/auth/refresh', { method: 'POST' }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (profile) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
};

export const attributeApi = {
  getAll: () => apiRequest('/attributes'),
  // Finishes
  getFinishes: () => apiRequest('/attributes/finishes'),
  addFinish: (data) => apiRequest('/attributes/finishes', { method: 'POST', body: JSON.stringify(data) }),
  updateFinish: (id, data) => apiRequest(`/attributes/finishes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFinish: (id) => apiRequest(`/attributes/finishes/${id}`, { method: 'DELETE' }),
  // Colors
  getColors: () => apiRequest('/attributes/colors'),
  addColor: (data) => apiRequest('/attributes/colors', { method: 'POST', body: JSON.stringify(data) }),
  updateColor: (id, data) => apiRequest(`/attributes/colors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteColor: (id) => apiRequest(`/attributes/colors/${id}`, { method: 'DELETE' }),
  // Brands
  getBrands: () => apiRequest('/attributes/brands'),
  addBrand: (data) => apiRequest('/attributes/brands', { method: 'POST', body: JSON.stringify(data) }),
  updateBrand: (id, data) => apiRequest(`/attributes/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBrand: (id) => apiRequest(`/attributes/brands/${id}`, { method: 'DELETE' }),
  // Sizes
  getSizes: () => apiRequest('/attributes/sizes'),
  addSize: (data) => apiRequest('/attributes/sizes', { method: 'POST', body: JSON.stringify(data) }),
  updateSize: (id, data) => apiRequest(`/attributes/sizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSize: (id) => apiRequest(`/attributes/sizes/${id}`, { method: 'DELETE' }),
  // Categories
  getCategories: () => apiRequest('/attributes/categories'),
  addCategory: (data) => apiRequest('/attributes/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => apiRequest(`/attributes/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => apiRequest(`/attributes/categories/${id}`, { method: 'DELETE' }),
};

export const productApi = {
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products${query ? `?${query}` : ''}`);
  },
  getProductById: (id) => apiRequest(`/products/${id}`),
  createProduct: (data) =>
    apiRequest('/products', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  updateProduct: (id, data) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  deleteProduct: (id) =>
    apiRequest(`/products/${id}`, {
      method: 'DELETE',
    }),
};

export const orderApi = {
  createOrder: (orderData) =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),
  getMyOrders: () => apiRequest('/orders/my-orders'),
  getOrderById: (id) => apiRequest(`/orders/${id}`),
  getAllOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/orders${query ? `?${query}` : ''}`);
  },
  updateOrderStatus: (id, payload) =>
    apiRequest(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getStats: () => apiRequest('/orders/stats/summary'),
  // PDFs are downloaded ONLY via downloadPdf below: an authenticated fetch
  // (Authorization header) turned into a blob object URL. The access token
  // must never travel in a URL query string (SEC-03) — it would leak into
  // server logs, proxies and browser history.
  downloadPdf: async (id, orderNumber = 'Document') => {
    const token = localStorage.getItem('hao_token');
    const response = await fetch(`${API_BASE}/orders/${id}/pdf`, {
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.message || 'Failed to download PDF');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HAO_Order_${orderNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const userApi = {
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/users${query ? `?${query}` : ''}`);
  },
  toggleStatus: (id) =>
    apiRequest(`/users/${id}/toggle-status`, {
      method: 'PATCH',
    }),
  // Role management (v0.9 F1, endpoint exists since v0.3)
  updateRole: (id, role) =>
    apiRequest(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
};

export const adminApi = {
  // Audit log viewer (v0.9 F1, endpoint exists since v0.3)
  getAuditLogs: (params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    const query = new URLSearchParams(clean).toString();
    return apiRequest(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
};

export const invoiceApi = {
  // GST QR payload + IRN (v0.9 F1). Figures come from the API verbatim.
  getGstQr: (id) => apiRequest(`/invoices/${id}/gst-qr`),
  generateIrn: (id) => apiRequest(`/invoices/${id}/irn`, { method: 'POST' }),
};
