import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { OrderProvider } from '../context/OrderContext';
import { LoginPage } from '../pages/auth/LoginPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { server } from '../test/server';
import { API_BASE, adminUser, buyerUser, loginSuccess } from '../test/fixtures';

// Never let Firebase initialise in tests (Google sign-in is not exercised).
vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

const CHALLENGE = { success: true, requires2fa: true, challengeToken: 'challenge-token-1' };

const useChallengeLogin = () =>
  server.use(
    http.post(`${API_BASE}/auth/login`, () => HttpResponse.json(CHALLENGE))
  );

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

const fillAndSubmitLogin = async (user) => {
  await user.type(
    screen.getByPlaceholderText(/haoverseas1313 or name@company\.com/i),
    'apex_tools'
  );
  await user.type(screen.getByPlaceholderText('••••••••'), 'correct-horse-10');
  await user.click(screen.getByRole('button', { name: /sign in to order desk/i }));
};

describe('Two-factor login challenge', () => {
  it('shows the challenge screen when login returns requires2fa, storing no session yet', async () => {
    useChallengeLogin();
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmitLogin(user);

    expect(await screen.findByText('Two-Factor Verification')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/6-digit code or backup code/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/backup codes/i)
    ).toBeInTheDocument();
    // No session exists until the code is verified.
    expect(localStorage.getItem('hao_token')).toBeNull();
  });

  it('shows the server error and clears the input on a wrong code', async () => {
    useChallengeLogin();
    server.use(
      http.post(`${API_BASE}/auth/2fa/verify`, () =>
        HttpResponse.json(
          { success: false, message: 'Invalid authentication code.' },
          { status: 401 }
        )
      )
    );
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmitLogin(user);
    const codeInput = await screen.findByPlaceholderText(/6-digit code or backup code/i);
    await user.type(codeInput, '000000');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    expect(await screen.findByText('Invalid authentication code.')).toBeInTheDocument();
    // Input cleared, still on the challenge screen, no navigation.
    expect(codeInput).toHaveValue('');
    expect(screen.getByText('Two-Factor Verification')).toBeInTheDocument();
  });

  it('completes login exactly like a normal login on the correct code', async () => {
    useChallengeLogin();
    let seenBody = null;
    server.use(
      http.post(`${API_BASE}/auth/2fa/verify`, async ({ request }) => {
        seenBody = await request.json();
        if (seenBody.code === '123456') return HttpResponse.json(loginSuccess);
        return HttpResponse.json(
          { success: false, message: 'Invalid authentication code.' },
          { status: 401 }
        );
      })
    );
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmitLogin(user);
    const codeInput = await screen.findByPlaceholderText(/6-digit code or backup code/i);
    await user.type(codeInput, '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    // Buyer accounts land on their dashboard, same as a normal login (v0.4).
    expect(await screen.findByText('Buyer Dashboard Landing')).toBeInTheDocument();
    expect(localStorage.getItem('hao_token')).toBe(loginSuccess.token);
    expect(seenBody).toEqual({ challengeToken: 'challenge-token-1', code: '123456' });
  });

  it('offers a restart when the challenge has expired', async () => {
    useChallengeLogin();
    server.use(
      http.post(`${API_BASE}/auth/2fa/verify`, () =>
        HttpResponse.json(
          { success: false, message: 'Challenge expired. Please sign in again.' },
          { status: 400 }
        )
      )
    );
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmitLogin(user);
    const codeInput = await screen.findByPlaceholderText(/6-digit code or backup code/i);
    await user.type(codeInput, '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    expect(
      await screen.findByText('Challenge expired. Please sign in again.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /restart login/i }));

    // Back on the credentials form.
    expect(await screen.findByText('Portal Sign In')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in to order desk/i })
    ).toBeInTheDocument();
  });

  it('returns to the credentials form via "back to login"', async () => {
    useChallengeLogin();
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmitLogin(user);
    expect(await screen.findByText('Two-Factor Verification')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to login/i }));

    expect(await screen.findByText('Portal Sign In')).toBeInTheDocument();
    expect(localStorage.getItem('hao_token')).toBeNull();
  });
});

const renderSettings = () =>
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    </MemoryRouter>
  );

const signInAs = (fixtureUser) => {
  localStorage.setItem('hao_token', 'access-token-1');
  server.use(
    http.get(`${API_BASE}/auth/me`, () =>
      HttpResponse.json({ success: true, user: fixtureUser })
    )
  );
};

describe('Settings page', () => {
  it('shows the 2FA section to staff and walks through setup to one-time backup codes', async () => {
    signInAs({ ...adminUser, twoFactorEnabled: false });
    server.use(
      http.post(`${API_BASE}/auth/2fa/setup`, () =>
        HttpResponse.json({
          success: true,
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUri: 'otpauth://totp/HAO:admin?secret=JBSWY3DPEHPK3PXP',
        })
      ),
      http.post(`${API_BASE}/auth/2fa/enable`, () =>
        HttpResponse.json({
          success: true,
          backupCodes: ['AAAA-1111', 'BBBB-2222'],
        })
      )
    );
    const user = userEvent.setup();
    renderSettings();

    expect(
      await screen.findByText('Two-factor authentication')
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /set up two-factor authentication/i })
    );

    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    expect(
      screen.getByText('otpauth://totp/HAO:admin?secret=JBSWY3DPEHPK3PXP')
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/confirmation code/i), '123456');
    await user.click(
      screen.getByRole('button', { name: /enable two-factor authentication/i })
    );

    expect(await screen.findByText('AAAA-1111')).toBeInTheDocument();
    expect(screen.getByText('BBBB-2222')).toBeInTheDocument();

    // Cannot leave the backup-codes step until the acknowledgement is ticked.
    const doneButton = screen.getByRole('button', { name: /^done$/i });
    expect(doneButton).toBeDisabled();
    await user.click(screen.getByLabelText(/i've saved these codes/i));
    expect(doneButton).toBeEnabled();
    await user.click(doneButton);

    expect(
      await screen.findByText(/two-factor authentication is enabled/i)
    ).toBeInTheDocument();
  });

  it('hides the 2FA section from buyers but still shows notifications', async () => {
    signInAs(buyerUser);
    renderSettings();

    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    expect(screen.queryByText('Two-factor authentication')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
  });

  it('wires the email-notifications toggle to the profile update endpoint', async () => {
    signInAs({ ...adminUser, notifications: { email: true } });
    let seenBody = null;
    server.use(
      http.put(`${API_BASE}/auth/profile`, async ({ request }) => {
        seenBody = await request.json();
        return HttpResponse.json({
          success: true,
          user: { ...adminUser, notifications: { email: false } },
        });
      })
    );
    const user = userEvent.setup();
    renderSettings();

    const toggle = await screen.findByLabelText(/email notifications/i);
    expect(toggle).toBeChecked();
    await user.click(toggle);

    expect(
      await screen.findByText('Notification preferences saved.')
    ).toBeInTheDocument();
    expect(seenBody).toEqual({ notifications: { email: false } });
    expect(toggle).not.toBeChecked();
  });
});
