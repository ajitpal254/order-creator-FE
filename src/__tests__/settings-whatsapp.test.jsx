import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { server } from '../test/server';
import { API_BASE, buyerUser } from '../test/fixtures';

// Never let Firebase initialise in tests (Google sign-in is not exercised).
vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// Buyer with email notifications on, WhatsApp off, and a saved phone.
// buyerUser also carries the older `phoneNumber` shape; `phone` must win.
const whatsappUser = {
  ...buyerUser,
  phone: '+91 98765 43210',
  notifications: { email: true, whatsapp: false },
};

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

// PUT handler that merges the request body into the fixture user, the way
// the real profile endpoint does, and hands the merged user back so the
// AuthContext state updates. Captured bodies are pushed to `bodies`.
const useMergingProfileUpdate = (bodies) =>
  server.use(
    http.put(`${API_BASE}/auth/profile`, async ({ request }) => {
      const body = await request.json();
      bodies.push(body);
      return HttpResponse.json({
        success: true,
        user: { ...whatsappUser, ...body },
      });
    })
  );

describe('Settings page — WhatsApp opt-in (v0.8 FEAT-11)', () => {
  it('shows the saved phone number and an unchecked WhatsApp toggle', async () => {
    signInAs(whatsappUser);
    renderSettings();

    // Wait until /auth/me has loaded the user into the form.
    const phoneField = await screen.findByDisplayValue('+91 98765 43210');
    expect(phoneField).toBe(screen.getByLabelText(/whatsapp number/i));

    const whatsappToggle = screen.getByLabelText(/whatsapp notifications/i);
    expect(whatsappToggle).not.toBeChecked();
    // The existing email preference is untouched.
    expect(screen.getByLabelText(/email notifications/i)).toBeChecked();
    expect(
      screen.getByText(/order updates on whatsapp — only if you've opted in\./i)
    ).toBeInTheDocument();
  });

  it('toggling WhatsApp on saves whatsapp:true and preserves email:true', async () => {
    signInAs(whatsappUser);
    const bodies = [];
    useMergingProfileUpdate(bodies);
    const user = userEvent.setup();
    renderSettings();

    await screen.findByDisplayValue('+91 98765 43210');
    const whatsappToggle = screen.getByLabelText(/whatsapp notifications/i);
    expect(whatsappToggle).not.toBeChecked();
    await user.click(whatsappToggle);

    expect(
      await screen.findByText('Notification preferences saved.')
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
    expect(bodies[0].notifications.whatsapp).toBe(true);
    expect(bodies[0].notifications.email).toBe(true);
    expect(whatsappToggle).toBeChecked();
  });

  it('saving a changed phone sends the new `phone` value', async () => {
    signInAs(whatsappUser);
    const bodies = [];
    useMergingProfileUpdate(bodies);
    const user = userEvent.setup();
    renderSettings();

    const phoneField = await screen.findByDisplayValue('+91 98765 43210');
    await user.clear(phoneField);
    await user.type(phoneField, '+91 11111 22222');
    await user.click(
      screen.getByRole('button', { name: /save whatsapp number/i })
    );

    expect(await screen.findByText('WhatsApp number saved.')).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toEqual({ phone: '+91 11111 22222' });
    expect(phoneField).toHaveValue('+91 11111 22222');
  });

  it('reverts the WhatsApp toggle and shows an error when the save fails', async () => {
    signInAs(whatsappUser);
    server.use(
      http.put(`${API_BASE}/auth/profile`, () =>
        HttpResponse.json(
          { success: false, message: 'Could not save notification preferences.' },
          { status: 500 }
        )
      )
    );
    const user = userEvent.setup();
    renderSettings();

    await screen.findByDisplayValue('+91 98765 43210');
    const whatsappToggle = screen.getByLabelText(/whatsapp notifications/i);
    expect(whatsappToggle).not.toBeChecked();
    await user.click(whatsappToggle);

    expect(
      await screen.findByText('Could not save notification preferences.')
    ).toBeInTheDocument();
    expect(whatsappToggle).not.toBeChecked();
  });
});
