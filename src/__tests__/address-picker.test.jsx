import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { OrderProvider } from '../context/OrderContext';
import { OrderCreatorPage } from '../pages/order/OrderCreatorPage';
import { server } from '../test/server';
import { API_BASE, myOrders, products } from '../test/fixtures';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// Confetti is a visual flourish on submit; it has no place in jsdom.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// Saved addresses served to the picker (local fixtures + handlers,
// following the per-test-file pattern of the other suites).
const savedAddresses = [
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
    line2: 'Dock 4',
    city: 'Houston',
    state: 'TX',
    country: 'United States',
    postalCode: '77001',
  },
];

let createdOrderBody;

beforeEach(() => {
  createdOrderBody = null;
  server.use(
    http.get(`${API_BASE}/addresses`, () =>
      HttpResponse.json({ success: true, data: savedAddresses })
    ),
    http.post(`${API_BASE}/orders`, async ({ request }) => {
      createdOrderBody = await request.json();
      return HttpResponse.json({ success: true, order: myOrders[0] });
    })
  );
});

const renderCreator = () => {
  localStorage.setItem('hao_token', 'access-token-1');
  return render(
    <MemoryRouter initialEntries={['/order-creator']}>
      <AuthProvider>
        <OrderProvider>
          <OrderCreatorPage />
        </OrderProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

// Adds the preselected fixture product so the order sheet (and its
// bill-to / ship-to blocks) renders.
const addFixtureLine = async (user) => {
  expect(
    await screen.findByText(`Selected SKU: ${products[0].sku}`)
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /add line item/i }));
  expect(await screen.findByText('Bill-to details')).toBeInTheDocument();
  expect(screen.getByText('Ship-to details')).toBeInTheDocument();
};

describe('Order form saved-address picker (v0.5 F3)', () => {
  it('fills the ship-to fields from a saved ship-to address, and bill-to from a bill-to one', async () => {
    const user = userEvent.setup();
    renderCreator();
    await addFixtureLine(user);

    // Each picker only offers addresses of its own type.
    const shipPicker = await screen.findByLabelText(/use a saved ship-to address/i);
    expect(screen.getByRole('option', { name: /Houston Warehouse/ })).toBeInTheDocument();
    await user.selectOptions(shipPicker, 'addr-ship-1');

    expect(document.getElementById('ship-to-line1')).toHaveValue('4400 Industrial Parkway');
    expect(document.getElementById('ship-to-line2')).toHaveValue('Dock 4');
    expect(document.getElementById('ship-to-city')).toHaveValue('Houston');
    expect(document.getElementById('ship-to-state')).toHaveValue('TX');
    expect(document.getElementById('ship-to-country')).toHaveValue('United States');
    expect(document.getElementById('ship-to-postalCode')).toHaveValue('77001');
    expect(document.getElementById('ship-to-label')).toHaveValue('Houston Warehouse');

    // Bill-to fields are untouched until its own picker is used.
    expect(document.getElementById('bill-to-line1')).toHaveValue('');

    const billPicker = screen.getByLabelText(/use a saved bill-to address/i);
    await user.selectOptions(billPicker, 'addr-bill-1');
    expect(document.getElementById('bill-to-line1')).toHaveValue('100 King Street West');
    expect(document.getElementById('bill-to-city')).toHaveValue('Toronto');
    expect(document.getElementById('bill-to-postalCode')).toHaveValue('M5X 1A9');
  });

  it('sends the picked addresses with the order on submit', async () => {
    const user = userEvent.setup();
    renderCreator();
    await addFixtureLine(user);

    const shipPicker = await screen.findByLabelText(/use a saved ship-to address/i);
    await user.selectOptions(shipPicker, 'addr-ship-1');

    await user.click(
      screen.getByRole('button', { name: /submit order to h\.a\. overseas/i })
    );

    // The submit went out with the ship-to block filled from the saved
    // address (contract field names + its type); bill-to was left blank
    // so it is not sent at all.
    expect(createdOrderBody).not.toBeNull();
    expect(createdOrderBody.shipTo).toEqual({
      label: 'Houston Warehouse',
      line1: '4400 Industrial Parkway',
      line2: 'Dock 4',
      city: 'Houston',
      state: 'TX',
      country: 'United States',
      postalCode: '77001',
      type: 'ship-to',
    });
    expect(createdOrderBody.billTo).toBeUndefined();
  });
});
