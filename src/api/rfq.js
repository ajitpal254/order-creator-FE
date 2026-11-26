// Public RFQ API (v0.9 F3).
//   POST /api/public/rfq { name, email, company, phone?, message, items[] }
// This endpoint is PUBLIC: the request is sent with a plain fetch and NO
// Authorization header, so it works for signed-out visitors (and never
// leaks a stored token into a public submission). `website` is a
// honeypot field: real visitors leave it empty, and it rides along in
// the payload so the backend can drop bot submissions that fill it.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const rfqApi = {
  submit: async (payload) => {
    const response = await fetch(`${API_BASE}/public/rfq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const isJson = response.headers
      .get('content-type')
      ?.includes('application/json');
    const data = isJson ? await response.json().catch(() => null) : null;
    if (!response.ok) {
      throw new Error(data?.message || 'Failed to send your quote request.');
    }
    return data;
  },
};
