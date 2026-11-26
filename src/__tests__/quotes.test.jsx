import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { QuotePanel } from '../components/order/QuotePanel';
import { server } from '../test/server';
import { API_BASE, adminUser, buyerUser } from '../test/fixtures';

// Never let Firebase initialise in tests (mirrors src/test/setup.js).
vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// Quote fixtures: amounts are values returned by the mocked API and are
// asserted verbatim — no pricing is computed in these tests.
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

const makeQuoteOrder = (overrides = {}) => ({
  _id: 'quote-1',
  orderNumber: 'HAO-2026-100777',
  orderType: 'Quote',
  status: 'Under Review',
  user: buyerUser._id,
  createdAt: daysFromNow(-5),
  totalQuantity: 200,
  totalAmount: 2500.0,
  quoteValidityDate: daysFromNow(30),
  quoteVersion: 2,
  counterOffers: [
    {
      _id: 'offer-1',
      by: buyerUser._id,
      byRole: 'buyer',
      amount: 2100,
      message: 'Can you do $2,100 for the full lot?',
      status: 'declined',
      createdAt: daysFromNow(-4),
    },
    {
      _id: 'offer-2',
      by: adminUser._id,
      byRole: 'admin',
      amount: 2300,
      message: 'Best we can do is $2,300 FOB.',
      status: 'pending',
      createdAt: daysFromNow(-3),
    },
  ],
  items: [],
  timeline: [],
  ...overrides,
});

let order;
let requests;
let pdfRequests;

const installQuoteHandlers = () => {
  server.use(
    http.post(`${API_BASE}/orders/:id/counter-offer`, async ({ request, params }) => {
      const body = await request.json();
      requests.push({ kind: 'counter-offer', orderId: params.id, body });
      order = {
        ...order,
        counterOffers: [
          ...order.counterOffers,
          {
            _id: `offer-${order.counterOffers.length + 1}`,
            by: buyerUser._id,
            byRole: 'buyer',
            amount: body.amount,
            message: body.message,
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      return HttpResponse.json({ success: true, data: order });
    }),
    http.post(
      `${API_BASE}/orders/:id/counter-offer/:offerId/respond`,
      async ({ request, params }) => {
        const body = await request.json();
        requests.push({ kind: 'respond', orderId: params.id, offerId: params.offerId, body });
        order = {
          ...order,
          counterOffers: order.counterOffers.map((o) =>
            o._id === params.offerId
              ? { ...o, status: body.accept ? 'accepted' : 'declined' }
              : o
          ),
        };
        return HttpResponse.json({ success: true, data: order });
      }
    ),
    http.post(`${API_BASE}/orders/:id/quote/accept`, ({ params }) => {
      requests.push({ kind: 'accept', orderId: params.id });
      order = { ...order, status: 'Confirmed' };
      return HttpResponse.json({ success: true, data: order });
    }),
    http.post(`${API_BASE}/orders/:id/quote/decline`, async ({ request, params }) => {
      const body = await request.json().catch(() => ({}));
      requests.push({ kind: 'decline', orderId: params.id, body });
      order = { ...order, status: 'Cancelled' };
      return HttpResponse.json({ success: true, data: order });
    }),
    http.get(`${API_BASE}/orders/:id/quote-pdf`, ({ params }) => {
      pdfRequests.push(params.id);
      return new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
        headers: { 'Content-Type': 'application/pdf' },
      });
    })
  );
};

const renderPanel = (panelOrder) => {
  localStorage.setItem('hao_token', 'test-token');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <QuotePanel order={panelOrder} />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  order = makeQuoteOrder();
  requests = [];
  pdfRequests = [];
  installQuoteHandlers();
});

describe('QuotePanel — thread rendering', () => {
  it('renders validity, version and the counter-offer thread with status chips', async () => {
    renderPanel(order);

    expect(await screen.findByText(/Version 2/)).toBeInTheDocument();
    expect(screen.getByText(/Valid until/)).toBeInTheDocument();

    // Both offers render with their API amounts and messages verbatim.
    expect(screen.getByText('$2100.00 USD')).toBeInTheDocument();
    expect(screen.getByText('Can you do $2,100 for the full lot?')).toBeInTheDocument();
    expect(screen.getByText('$2300.00 USD')).toBeInTheDocument();
    expect(screen.getByText('Best we can do is $2,300 FOB.')).toBeInTheDocument();

    // Status chips + role labels.
    expect(screen.getByText('declined')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText(/^Buyer/)).toBeInTheDocument();
    expect(screen.getByText(/^Staff/)).toBeInTheDocument();
  });

  it('renders nothing for a regular (non-quote) order', async () => {
    const { container } = renderPanel({ ...order, orderType: 'Order' });
    await waitFor(() => expect(container.querySelector('section')).toBeNull());
    expect(screen.queryByText(/Counter-offers/)).not.toBeInTheDocument();
  });
});

describe('QuotePanel — buyer actions', () => {
  it('submits a counter-offer and shows it in the thread', async () => {
    const user = userEvent.setup();
    renderPanel(order);

    await user.type(await screen.findByLabelText('Counter-offer amount'), '2200');
    await user.type(screen.getByLabelText('Counter-offer message'), 'Meet me at $2,200?');
    await user.click(screen.getByRole('button', { name: /send counter-offer/i }));

    await waitFor(() =>
      expect(requests).toContainEqual({
        kind: 'counter-offer',
        orderId: 'quote-1',
        body: { amount: 2200, message: 'Meet me at $2,200?' },
      })
    );
    expect(await screen.findByText('$2200.00 USD')).toBeInTheDocument();
    expect(screen.getByText('Meet me at $2,200?')).toBeInTheDocument();
  });

  it('accepts the quote via POST /quote/accept', async () => {
    const user = userEvent.setup();
    renderPanel(order);

    await user.click(await screen.findByRole('button', { name: /accept quote/i }));

    await waitFor(() =>
      expect(requests).toContainEqual({ kind: 'accept', orderId: 'quote-1' })
    );
  });

  it('declines the quote with an optional reason', async () => {
    const user = userEvent.setup();
    renderPanel(order);

    await user.click(await screen.findByRole('button', { name: /decline quote/i }));
    await user.type(await screen.findByLabelText('Decline reason'), 'Price too high');
    await user.click(screen.getByRole('button', { name: /confirm decline/i }));

    await waitFor(() =>
      expect(requests).toContainEqual({
        kind: 'decline',
        orderId: 'quote-1',
        body: { reason: 'Price too high' },
      })
    );
  });

  it('does not show staff respond buttons to the buyer', async () => {
    renderPanel(order);

    expect(await screen.findByText('pending')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept offer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline offer/i })).not.toBeInTheDocument();
  });

  it('downloads the quote PDF as a blob', async () => {
    const createObjectURL = vi.fn(() => 'blob:quote-pdf');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });
    const user = userEvent.setup();
    renderPanel(order);

    await user.click(await screen.findByRole('button', { name: /download quote pdf/i }));

    await waitFor(() => expect(pdfRequests).toEqual(['quote-1']));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });
});

describe('QuotePanel — staff actions', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ success: true, user: adminUser })
      )
    );
  });

  it('lets staff accept a pending counter-offer', async () => {
    const user = userEvent.setup();
    renderPanel(order);

    await user.click(await screen.findByRole('button', { name: /accept offer/i }));

    await waitFor(() =>
      expect(requests).toContainEqual({
        kind: 'respond',
        orderId: 'quote-1',
        offerId: 'offer-2',
        body: { accept: true },
      })
    );
    expect(await screen.findByText('accepted')).toBeInTheDocument();
  });

  it('lets staff decline a pending counter-offer', async () => {
    const user = userEvent.setup();
    renderPanel(order);

    await user.click(await screen.findByRole('button', { name: /decline offer/i }));

    await waitFor(() =>
      expect(requests).toContainEqual({
        kind: 'respond',
        orderId: 'quote-1',
        offerId: 'offer-2',
        body: { accept: false },
      })
    );
  });

  it('does not show buyer actions to staff', async () => {
    renderPanel(order);

    expect(await screen.findByText('pending')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send counter-offer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept quote/i })).not.toBeInTheDocument();
  });
});

describe('QuotePanel — expired quote', () => {
  it('shows the expired notice and disables buyer actions', async () => {
    renderPanel(makeQuoteOrder({ quoteValidityDate: daysFromNow(-10) }));

    expect(await screen.findByText(/This quote has expired/)).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: /send counter-offer/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /accept quote/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /decline quote/i })).toBeDisabled();
    expect(screen.getByLabelText('Counter-offer amount')).toBeDisabled();
    expect(screen.getByLabelText('Counter-offer message')).toBeDisabled();

    // The thread itself stays readable.
    expect(screen.getByText('$2300.00 USD')).toBeInTheDocument();
  });
});
