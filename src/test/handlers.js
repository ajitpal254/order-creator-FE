import { http, HttpResponse } from 'msw';
import { API_BASE, assistantFaq, assistantReply, attributes, buyerUser, loginSuccess, myOrders, products, templates } from './fixtures';

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
];
