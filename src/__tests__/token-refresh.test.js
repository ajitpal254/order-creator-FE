import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { apiRequest, productApi } from '../api/client';
import { server } from '../test/server';
import { API_BASE, products } from '../test/fixtures';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

describe('api client token refresh', () => {
  it('refreshes once on a 401 and retries the original request with the new token', async () => {
    localStorage.setItem('hao_token', 'expired-access-token');

    let productsCalls = 0;
    let refreshCalls = 0;
    const seenAuthHeaders = [];

    server.use(
      http.get(`${API_BASE}/products`, ({ request }) => {
        productsCalls += 1;
        seenAuthHeaders.push(request.headers.get('authorization'));
        if (productsCalls === 1) {
          return HttpResponse.json(
            { success: false, message: 'Token expired' },
            { status: 401 }
          );
        }
        return HttpResponse.json({ success: true, data: products });
      }),
      http.post(`${API_BASE}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({
          success: true,
          accessToken: 'refreshed-access-token',
        });
      })
    );

    const res = await productApi.getProducts();

    expect(res.success).toBe(true);
    expect(res.data).toEqual(products);
    expect(productsCalls).toBe(2);
    expect(refreshCalls).toBe(1);
    // First attempt carried the stale token, the retry the refreshed one.
    expect(seenAuthHeaders).toEqual([
      'Bearer expired-access-token',
      'Bearer refreshed-access-token',
    ]);
    // The refreshed token replaces the stale one in storage.
    expect(localStorage.getItem('hao_token')).toBe('refreshed-access-token');
  });

  it('clears the session and surfaces the 401 when refresh fails', async () => {
    localStorage.setItem('hao_token', 'expired-access-token');

    server.use(
      http.get(`${API_BASE}/products`, () =>
        HttpResponse.json(
          { success: false, message: 'Token expired' },
          { status: 401 }
        )
      ),
      http.post(`${API_BASE}/auth/refresh`, () =>
        HttpResponse.json(
          { success: false, message: 'Session expired' },
          { status: 401 }
        )
      )
    );

    await expect(apiRequest('/products')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('hao_token')).toBeNull();
  });
});
