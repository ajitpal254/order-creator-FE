import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import App from '../App';
import { server } from '../test/server';
import { API_BASE, adminUser, buyerUser } from '../test/fixtures';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// App uses BrowserRouter, so drive it via the history API before render.
const renderAppAt = (path) => {
  window.history.pushState({}, '', path);
  return render(<App />);
};

const mockMe = (user) =>
  server.use(
    http.get(`${API_BASE}/auth/me`, () =>
      HttpResponse.json({ success: true, user })
    )
  );

describe('Route guards', () => {
  it('redirects an unauthenticated visitor from /my-orders to /login', async () => {
    renderAppAt('/my-orders');

    expect(await screen.findByText('Portal Sign In')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('redirects an unauthenticated visitor from /admin to /login', async () => {
    renderAppAt('/admin');

    expect(await screen.findByText('Portal Sign In')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('keeps an authenticated non-admin out of /admin (redirects home)', async () => {
    localStorage.setItem('hao_token', 'buyer-token');
    mockMe(buyerUser);

    renderAppAt('/admin');

    // AdminRoute sends non-admins to '/', which renders the Home page hero
    // (the hero <h1> splits its text across a nested <span>, so match the
    // span's own text node).
    expect(
      await screen.findByText('Custom Order Creator')
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('lets an authenticated buyer reach /my-orders', async () => {
    localStorage.setItem('hao_token', 'buyer-token');
    mockMe(buyerUser);

    renderAppAt('/my-orders');

    expect(
      await screen.findByText('My Orders & Production Tracking')
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/my-orders');
  });

  it('lets an authenticated admin reach /admin', async () => {
    localStorage.setItem('hao_token', 'admin-token');
    mockMe(adminUser);
    // AdminDashboard fans out to several endpoints; give them empty-but-valid
    // shapes so the page can mount. Stats/users already tolerate failure via
    // .catch in the page, orders/products/attributes need real handlers.
    server.use(
      http.get(`${API_BASE}/orders/stats/summary`, () =>
        HttpResponse.json({ success: true, data: {} })
      ),
      http.get(`${API_BASE}/orders`, () =>
        HttpResponse.json({ success: true, data: [] })
      ),
      http.get(`${API_BASE}/users`, () =>
        HttpResponse.json({ success: true, data: [] })
      )
    );

    renderAppAt('/admin');

    expect(window.location.pathname).toBe('/admin');
    expect(
      await screen.findByText('Factory Administration Center')
    ).toBeInTheDocument();
  });
});
