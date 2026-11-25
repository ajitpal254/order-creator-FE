import { http, HttpResponse } from 'msw';
import { API_BASE, attributes, buyerUser, loginSuccess, myOrders, products } from './fixtures';

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
];
