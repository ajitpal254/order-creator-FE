import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { OrderProvider } from '../context/OrderContext';
import { LoginPage } from '../pages/auth/LoginPage';
import { server } from '../test/server';
import { API_BASE, loginSuccess } from '../test/fixtures';

// Never let Firebase initialise in tests (Google sign-in is not exercised).
vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <OrderProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Buyer Dashboard Landing</div>} />
            <Route path="/order-creator" element={<div>Order Creator Landing</div>} />
            <Route path="/admin" element={<div>Admin Landing</div>} />
          </Routes>
        </OrderProvider>
      </AuthProvider>
    </MemoryRouter>
  );

const fillAndSubmit = async (user) => {
  await user.type(
    screen.getByPlaceholderText(/haoverseas1313 or name@company\.com/i),
    'apex_tools'
  );
  await user.type(screen.getByPlaceholderText('••••••••'), 'correct-horse-10');
  await user.click(screen.getByRole('button', { name: /sign in to order desk/i }));
};

describe('Login flow', () => {
  it('stores the session token and navigates on a successful login', async () => {
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    // Buyer accounts land on their dashboard after login (v0.4, FE-13).
    expect(await screen.findByText('Buyer Dashboard Landing')).toBeInTheDocument();
    // The session is persisted exactly as the app does today.
    expect(localStorage.getItem('hao_token')).toBe(loginSuccess.token);
  });

  it('shows the server error and stores nothing on a failed login', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login`, () =>
        HttpResponse.json(
          { success: false, message: 'Invalid credentials. Please try again.' },
          { status: 401 }
        )
      )
    );
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    expect(
      await screen.findByText('Invalid credentials. Please try again.')
    ).toBeInTheDocument();
    expect(localStorage.getItem('hao_token')).toBeNull();
    // Still on the login page.
    expect(screen.getByText('Portal Sign In')).toBeInTheDocument();
  });
});
