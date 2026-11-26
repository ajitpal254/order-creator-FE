import { http, HttpResponse } from 'msw';
import { API_BASE, assistantCreatedOrder, assistantExtractedProposal, assistantFaq, assistantReply, attributes, buyerUser, loginSuccess, myOrders, products, templates } from './fixtures';

// Default MSW handlers for the happy paths. Individual tests override
// behaviour with server.use(...) (e.g. a 401 login, an expired token).
export const handlers = [
  http.post(`${API_BASE}/auth/login`, () => HttpResponse.json(loginSuccess)),

  http.post(`${API_BASE}/auth/signup`, () => HttpResponse.json(loginSuccess)),

  http.post(`${API_BASE}/auth/refresh`, () =>
    HttpResponse.json({ success: true, accessToken: 'refreshed-access-token' })
  ),

  http.post(`${API_BASE}/auth/logout`, () => HttpResponse.json({ success: true })),

  http.get(`${API_BASE}/auth/me`, () =>
    HttpResponse.json({ success: true, user: buyerUser })
  ),

  http.get(`${API_BASE}/products`, () =>
    HttpResponse.json({ success: true, data: products })
  ),

  http.get(`${API_BASE}/attributes`, () =>
    HttpResponse.json({ success: true, data: attributes })
  ),

  http.get(`${API_BASE}/orders/my-orders`, () =>
    HttpResponse.json({ success: true, data: myOrders })
  ),

  http.post(`${API_BASE}/orders`, () =>
    HttpResponse.json({ success: true, order: myOrders[0] })
  ),

  http.get(`${API_BASE}/templates`, () =>
    HttpResponse.json({ success: true, data: templates })
  ),

  http.post(`${API_BASE}/templates`, async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json({
      success: true,
      data: { _id: 'tpl-new', ...body },
    });
  }),

  http.delete(`${API_BASE}/templates/:id`, () =>
    HttpResponse.json({ success: true })
  ),

  http.post(`${API_BASE}/templates/:id/create-order`, () =>
    HttpResponse.json({ success: true, order: myOrders[0] })
  ),

  // Assistant (v0.7 FEAT-16 Stages 1–2 — F1)
  http.post(`${API_BASE}/assistant/message`, () =>
    HttpResponse.json(assistantReply)
  ),

  http.post(`${API_BASE}/assistant/handoff`, () =>
    HttpResponse.json({ ok: true })
  ),

  http.post(`${API_BASE}/assistant/feedback`, () =>
    HttpResponse.json({ ok: true })
  ),

  http.get(`${API_BASE}/assistant/faq`, () => HttpResponse.json(assistantFaq)),

  http.delete(`${API_BASE}/assistant/conversations/:id`, () =>
    HttpResponse.json({ ok: true })
  ),

  // Assistant proposals + PO extraction (v1.0 FEAT-16 Stages 3–4 — F2)
  http.post(`${API_BASE}/assistant/proposals/:id/confirm`, () =>
    HttpResponse.json({ order: assistantCreatedOrder })
  ),

  http.post(`${API_BASE}/assistant/proposals/:id/dismiss`, () =>
    HttpResponse.json({ ok: true })
  ),

  // The XHR upload is credentialed + carries Authorization, so browsers
  // (and the jsdom/MSW XHR interceptor) send a CORS preflight first — the
  // real backend's CORS middleware answers it in production.
  http.options(
    `${API_BASE}/assistant/extract-po`,
    ({ request }) =>
      new HttpResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers':
            request.headers.get('access-control-request-headers') ||
            'Authorization, Content-Type',
        },
      })
  ),

  http.post(`${API_BASE}/assistant/extract-po`, ({ request }) =>
    HttpResponse.json(
      { proposal: assistantExtractedProposal },
      {
        headers: {
          'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      }
    )
  ),
];

// ---- v0.9 F1 Admin Console v2 (appended) ----
// Note: individual v0.9 tests mostly use server.use(...) locally; these
// defaults keep the new endpoints from being unhandled elsewhere.
handlers.push(
  http.get(`${API_BASE}/admin/audit-logs`, () =>
    HttpResponse.json({ success: true, count: 0, total: 0, page: 1, limit: 50, data: [] })
  ),
);

// ---- v1.0 F1 Developer (appended) ----
// Defaults are empty lists so other suites rendering the Settings page
// stay green; the developer tests override with fixtures via server.use.
handlers.push(
  http.get(`${API_BASE}/developer/keys`, () =>
    HttpResponse.json({ success: true, data: [] })
  ),
  http.get(`${API_BASE}/developer/webhooks`, () =>
    HttpResponse.json({ success: true, data: [] })
  ),
);
