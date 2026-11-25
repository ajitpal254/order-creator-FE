import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { PayPanel } from '../components/payments/PayPanel';
import { redirectTo } from '../lib/redirect';
import { server } from '../test/server';
import { API_BASE, adminUser, buyerUser } from '../test/fixtures';

// The checkout redirect goes through this one helper so tests can spy
// on it instead of fighting jsdom's read-only window.location.
vi.mock('../lib/redirect', () => ({
  redirectTo: vi.fn(),
}));

// Local fixtures: amounts are API values asserted verbatim — no pricing
// is computed in these tests. balanceDue (1200) deliberately differs
// from totalAmount (2500) so the default-amount source is observable.
const order = {
  _id: 'order-1',
  orderNumber: 'HAO-2026-100001',
  status: 'Confirmed',
  createdAt: '2026-11-20T10:30:00.000Z',
  totalQuantity: 200,
  totalAmount: 2500.0,
  balanceDue: 1200.0,
  paymentStatus: 'partially_paid',
  items: [],
  timeline: [],
};

let paymentsList;
let requests;

const renderPanel = (panelOrder = order, props = {}) => {
  localStorage.setItem('hao_token', 'test-token');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <PayPanel order={panelOrder} {...props} />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  paymentsList = [];
  requests = [];
  vi.mocked(redirectTo).mockClear();
  server.use(
    http.get(`${API_BASE}/payments/order/:orderId`, () =>
      HttpResponse.json({ success: true, data: paymentsList })
    )
  );
});

describe('PayPanel — card payments', () => {
  it('defaults the amount to balanceDue and redirects to the checkoutUrl', async () => {
    server.use(
      http.post(`${API_BASE}/payments/request`, async ({ request }) => {
        const body = await request.json();
        requests.push(body);
        return HttpResponse.json({
          success: true,
          payment: {
            _id: 'pay-card-1',
            amount: body.amount,
            currency: 'USD',
            method: 'card',
            status: 'pending',
            createdAt: '2026-11-25T10:00:00.000Z',
          },
          checkoutUrl: 'https://checkout.example.com/pay/pay-card-1',
        });
      })
    );
    const user = userEvent.setup();
    renderPanel();

    // Amount defaults to the API-provided balanceDue, not totalAmount.
    expect(await screen.findByLabelText('Payment amount')).toHaveValue(1200);
    expect(screen.getByText(/Balance due:/)).toHaveTextContent('$1200.00 USD');

    await user.click(screen.getByRole('button', { name: /^pay$/i }));

    await waitFor(() =>
      expect(requests).toContainEqual({ orderId: 'order-1', amount: 1200, method: 'card' })
    );
    await waitFor(() =>
      expect(redirectTo).toHaveBeenCalledWith('https://checkout.example.com/pay/pay-card-1')
    );
  });

  it('falls back to order.totalAmount when balanceDue is absent', async () => {
    renderPanel({ ...order, balanceDue: undefined, paymentStatus: undefined });
    expect(await screen.findByLabelText('Payment amount')).toHaveValue(2500);
  });
});

describe('PayPanel — 503 PAYMENTS_NOT_CONFIGURED fallback + proof upload', () => {
  const BANK_INSTRUCTIONS =
    'Bank: Example Bank\nAccount name: H.A. Overseas\nAccount: 123456789\nReference: HAO-2026-100001';

  // Deterministic XHR stub for the proof upload: records the request and
  // reports one progress event before succeeding, so the progress wiring
  // in paymentsApi.uploadProof is exercised without real network timing.
  class FakeXHR {
    static instances = [];
    constructor() {
      this.upload = {};
      this.headers = {};
      FakeXHR.instances.push(this);
    }
    open(method, url) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name, value) {
      this.headers[name] = value;
    }
    send(body) {
      this.body = body;
      this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
      this.status = 200;
      this.responseText = JSON.stringify({ success: true });
      this.onload?.();
    }
  }

  it('shows bank-transfer instructions and completes the proof upload flow', async () => {
    server.use(
      http.post(`${API_BASE}/payments/request`, async ({ request }) => {
        const body = await request.json();
        requests.push(body);
        if (body.method === 'card') {
          return HttpResponse.json(
            { code: 'PAYMENTS_NOT_CONFIGURED', message: 'Card payments are not configured' },
            { status: 503 }
          );
        }
        return HttpResponse.json({
          success: true,
          payment: {
            _id: 'pay-bank-1',
            amount: body.amount,
            currency: 'USD',
            method: 'bank_transfer',
            status: 'pending',
            createdAt: '2026-11-25T10:00:00.000Z',
          },
          instructions: BANK_INSTRUCTIONS,
        });
      })
    );
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: /^pay$/i }));

    // The 503 triggers the fallback: note + verbatim instructions.
    expect(
      await screen.findByText(/Card payments aren't available yet/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/Account: 123456789/)).toBeInTheDocument();
    expect(requests).toContainEqual({
      orderId: 'order-1',
      amount: 1200,
      method: 'bank_transfer',
    });

    // Proof upload: pick a file and upload it against the bank payment.
    const file = new File(['receipt-bytes'], 'receipt.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Payment proof file'), file);
    await user.click(screen.getByRole('button', { name: /upload proof/i }));

    expect(await screen.findByText('Payment proof uploaded.')).toBeInTheDocument();
    expect(FakeXHR.instances).toHaveLength(1);
    const xhr = FakeXHR.instances[0];
    expect(xhr.url).toContain('/payments/pay-bank-1/proof');
    expect(xhr.headers.Authorization).toBe('Bearer test-token');
    expect(xhr.body).toBeInstanceOf(FormData);
    expect(xhr.body.get('file')).toBe(file);

    vi.unstubAllGlobals();
  });
});

describe('PayPanel — payments list + staff review', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ success: true, user: adminUser })
      ),
      http.post(`${API_BASE}/payments/:id/confirm`, ({ params }) => {
        requests.push({ kind: 'confirm', paymentId: params.id });
        paymentsList = paymentsList.map((p) =>
          (p._id ?? p.id) === params.id ? { ...p, status: 'confirmed' } : p
        );
        return HttpResponse.json({ success: true });
      }),
      http.post(`${API_BASE}/payments/:id/reject`, async ({ request, params }) => {
        const body = await request.json();
        requests.push({ kind: 'reject', paymentId: params.id, body });
        paymentsList = paymentsList.map((p) =>
          (p._id ?? p.id) === params.id ? { ...p, status: 'rejected' } : p
        );
        return HttpResponse.json({ success: true });
      })
    );
    paymentsList = [
      {
        _id: 'pay-1',
        amount: 800,
        currency: 'USD',
        method: 'bank_transfer',
        status: 'proof_submitted',
        createdAt: '2026-11-24T09:00:00.000Z',
      },
      {
        id: 'pay-2',
        amount: 400,
        currency: 'USD',
        method: 'bank_transfer',
        status: 'proof_submitted',
        createdAt: '2026-11-24T11:00:00.000Z',
      },
      {
        _id: 'pay-3',
        amount: 100,
        currency: 'USD',
        method: 'card',
        status: 'confirmed',
        createdAt: '2026-11-23T11:00:00.000Z',
      },
    ];
  });

  it('renders status chips and lets staff confirm a proof_submitted payment', async () => {
    const user = userEvent.setup();
    renderPanel(order, { staff: true });

    expect(await screen.findByText('$800.00 USD')).toBeInTheDocument();
    expect(screen.getByText('$400.00 USD')).toBeInTheDocument();
    expect(screen.getByText('$100.00 USD')).toBeInTheDocument();
    expect(screen.getAllByText('proof_submitted')).toHaveLength(2);
    expect(screen.getByText('confirmed')).toBeInTheDocument();

    // Staff see no buyer payment form.
    expect(screen.queryByLabelText('Payment amount')).not.toBeInTheDocument();

    // Confirm/reject show only on the two proof_submitted rows.
    const confirmButtons = screen.getAllByRole('button', { name: /confirm payment/i });
    expect(confirmButtons).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /reject payment/i })).toHaveLength(2);

    await user.click(confirmButtons[0]);

    await waitFor(() =>
      expect(requests).toContainEqual({ kind: 'confirm', paymentId: 'pay-1' })
    );
    // List refreshed: pay-1 now reads confirmed, one proof_submitted left.
    await waitFor(() => expect(screen.getAllByText('proof_submitted')).toHaveLength(1));
    expect(screen.getAllByText('confirmed')).toHaveLength(2);
  });

  it('lets staff reject a payment with a reason via the modal', async () => {
    const user = userEvent.setup();
    renderPanel(order, { staff: true });

    const rejectButtons = await screen.findAllByRole('button', { name: /reject payment/i });
    await user.click(rejectButtons[1]);

    await user.type(await screen.findByLabelText('Rejection reason'), 'Amount mismatch');
    await user.click(screen.getByRole('button', { name: /confirm reject/i }));

    await waitFor(() =>
      expect(requests).toContainEqual({
        kind: 'reject',
        paymentId: 'pay-2',
        body: { reason: 'Amount mismatch' },
      })
    );
    expect(await screen.findByText('rejected')).toBeInTheDocument();
  });

  it('hides confirm/reject from buyers', async () => {
    // Back to the buyer /auth/me (default handler) for this render.
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ success: true, user: buyerUser })
      )
    );
    renderPanel();

    expect(await screen.findByText('$800.00 USD')).toBeInTheDocument();
    expect(screen.getAllByText('proof_submitted')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /confirm payment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject payment/i })).not.toBeInTheDocument();
  });
});
