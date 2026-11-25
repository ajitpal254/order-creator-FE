import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { queryClient } from '../lib/queryClient';
import { server } from '../test/server';
import { API_BASE } from '../test/fixtures';

// Never let Firebase initialise in tests (mirrors src/test/setup.js).
vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// Local fixtures + stateful handlers for the addresses contract
// (registered per-test-file with server.use(...), following the
// notifications suite's pattern).
const sampleAddresses = () => [
  {
    _id: 'addr-bill-1',
    label: 'Head Office',
    type: 'bill-to',
    line1: '100 King Street West',
    line2: 'Suite 900',
    city: 'Toronto',
    state: 'ON',
    country: 'Canada',
    postalCode: 'M5X 1A9',
  },
  {
    _id: 'addr-ship-1',
    label: 'Houston Warehouse',
    type: 'ship-to',
    line1: '4400 Industrial Parkway',
    line2: '',
    city: 'Houston',
    state: 'TX',
    country: 'United States',
    postalCode: '77001',
  },
];

let addresses;
let createdBodies;
let updatedCalls;
let deletedIds;

const installAddressHandlers = () => {
  server.use(
    http.get(`${API_BASE}/addresses`, () =>
      HttpResponse.json({ success: true, data: addresses })
    ),
    http.post(`${API_BASE}/addresses`, async ({ request }) => {
      const body = await request.json();
      createdBodies.push(body);
      const created = { _id: 'addr-new-1', ...body };
      addresses = [...addresses, created];
      return HttpResponse.json({ success: true, data: created });
    }),
    http.put(`${API_BASE}/addresses/:id`, async ({ params, request }) => {
      const body = await request.json();
      updatedCalls.push({ id: params.id, body });
      addresses = addresses.map((a) => (a._id === params.id ? { ...a, ...body } : a));
      return HttpResponse.json({ success: true, data: { _id: params.id, ...body } });
    }),
    http.delete(`${API_BASE}/addresses/:id`, ({ params }) => {
      deletedIds.push(params.id);
      addresses = addresses.filter((a) => a._id !== params.id);
      return HttpResponse.json({ success: true });
    })
  );
};

const renderSettings = () => {
  localStorage.setItem('hao_token', 'access-token-1');
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  addresses = sampleAddresses();
  createdBodies = [];
  updatedCalls = [];
  deletedIds = [];
  // The settings addresses section uses the app's shared query client;
  // clear it so no list data leaks between tests.
  queryClient.clear();
  installAddressHandlers();
});

describe('Settings addresses manager (v0.5 F3)', () => {
  it('lists saved addresses with their type labels', async () => {
    renderSettings();

    expect(await screen.findByText('Head Office')).toBeInTheDocument();
    expect(screen.getByText('Bill-to')).toBeInTheDocument();
    expect(screen.getByText(/100 King Street West/)).toBeInTheDocument();

    expect(screen.getByText('Houston Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Ship-to')).toBeInTheDocument();
    expect(screen.getByText(/4400 Industrial Parkway/)).toBeInTheDocument();
  });

  it('adds a new address through the form and shows it in the list', async () => {
    const user = userEvent.setup();
    renderSettings();

    await screen.findByText('Head Office');
    await user.click(screen.getByRole('button', { name: /add address/i }));

    await user.type(screen.getByLabelText(/label/i), 'Port Office');
    await user.selectOptions(screen.getByLabelText(/type/i), 'ship-to');
    await user.type(screen.getByLabelText(/address line 1/i), '77 Harbour Road');
    await user.type(screen.getByLabelText(/city/i), 'Vancouver');
    await user.type(screen.getByLabelText(/country/i), 'Canada');
    await user.type(screen.getByLabelText(/postal code/i), 'V6C 2R2');

    await user.click(screen.getByRole('button', { name: /add address/i }));

    expect(await screen.findByText('Port Office')).toBeInTheDocument();
    expect(screen.getByText('Address saved.')).toBeInTheDocument();
    expect(createdBodies).toEqual([
      {
        label: 'Port Office',
        type: 'ship-to',
        line1: '77 Harbour Road',
        line2: '',
        city: 'Vancouver',
        state: '',
        country: 'Canada',
        postalCode: 'V6C 2R2',
      },
    ]);
  });

  it('edits an existing address', async () => {
    const user = userEvent.setup();
    renderSettings();

    await screen.findByText('Head Office');
    const [firstEdit] = screen.getAllByRole('button', { name: /edit/i });
    await user.click(firstEdit);

    const cityInput = screen.getByLabelText(/city/i);
    expect(cityInput).toHaveValue('Toronto');
    await user.clear(cityInput);
    await user.type(cityInput, 'Ottawa');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/Ottawa/)).toBeInTheDocument();
    expect(screen.getByText('Address updated.')).toBeInTheDocument();
    expect(updatedCalls).toHaveLength(1);
    expect(updatedCalls[0].id).toBe('addr-bill-1');
    expect(updatedCalls[0].body).toMatchObject({ city: 'Ottawa', type: 'bill-to' });
  });

  it('deletes an address and removes it from the list', async () => {
    const user = userEvent.setup();
    renderSettings();

    await screen.findByText('Head Office');
    const [firstDelete] = screen.getAllByRole('button', { name: /delete/i });
    await user.click(firstDelete);

    expect(await screen.findByText('Address deleted.')).toBeInTheDocument();
    expect(screen.queryByText('Head Office')).not.toBeInTheDocument();
    expect(deletedIds).toEqual(['addr-bill-1']);
    // The other address is untouched.
    expect(screen.getByText('Houston Warehouse')).toBeInTheDocument();
  });
});
