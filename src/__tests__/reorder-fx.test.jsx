import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { MyOrdersPage } from '../pages/orders/MyOrdersPage';
import { server } from '../test/server';
import { API_BASE, myOrders } from '../test/fixtures';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// A confirmed order carrying the backend's locked-FX snapshot. Every
// figure is a fixture value returned by the mocked API; the FX line must
// render them verbatim (display only, no conversion in the UI).
const fxOrder = {
  _id: 'order-2',
  orderNumber: 'HAO-2026-100002',
  status: 'Confirmed',
  createdAt: '2026-11-21T09:00:00.000Z',
  totalQuantity: 50,
  totalAmount: 4980.0,
  shippingMarks: '',
  timeline: [],
  items: [],
  fxRateLocked: 0.012,
  baseCurrency: 'USD',
  baseTotal: 4980.0,
};

// The new Draft the reorder endpoint returns.
const draftOrder = {
  _id: 'order-draft-new',
  orderNumber: 'HAO-2026-100003',
  status: 'Draft',
  createdAt: '2026-11-25T15:00:00.000Z',
  totalQuantity: 200,
  totalAmount: 2500.0,
  shippingMarks: 'APEX / LOT 44',
  timeline: [],
  items: [],
};

let reorderCalls;
let reorderShouldFail;

const installHandlers = () => {
  server.use(
    http.get(`${API_BASE}/orders/my-orders`, ({ request }) => {
      const url = new URL(request.url);
      // Mirror the real backend: drafts are excluded unless asked for.
      const data =
        url.searchParams.get('includeDrafts') === 'true'
          ? [...myOrders, fxOrder, draftOrder]
          : [...myOrders, fxOrder];
      return HttpResponse.json({ success: true, data });
    }),
    http.post(`${API_BASE}/orders/:id/reorder`, ({ params }) => {
      reorderCalls.push(params.id);
      if (reorderShouldFail) {
        return HttpResponse.json(
          { success: false, message: 'Reorder is not available for this order.' },
          { status: 400 }
        );
      }
      return HttpResponse.json({ success: true, order: draftOrder });
    })
  );
};

const renderMyOrders = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/my-orders']}>
        <AuthProvider>
          <MyOrdersPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  reorderCalls = [];
  reorderShouldFail = false;
  installHandlers();
});

describe('My Orders reorder (v0.5 F3)', () => {
  it('reorders a past order and lands back with the new draft highlighted', async () => {
    const user = userEvent.setup();
    renderMyOrders();

    expect(await screen.findByText(myOrders[0].orderNumber)).toBeInTheDocument();

    const [firstReorder] = screen.getAllByRole('button', { name: /reorder/i });
    await user.click(firstReorder);

    await waitFor(() => expect(reorderCalls).toEqual(['order-1']));

    // Success banner names both orders.
    expect(
      await screen.findByText(
        /New draft HAO-2026-100003 created from HAO-2026-100001/
      )
    ).toBeInTheDocument();

    // The new draft shows up (fetched with drafts included because the
    // highlight param is set) with the highlight treatment + badge.
    const draftNumber = await screen.findByText('HAO-2026-100003');
    const draftCard = draftNumber.closest('.glass-card');
    expect(draftCard).toHaveClass('highlight');
    expect(draftCard).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByText('New draft')).toBeInTheDocument();
  });

  it('shows an error banner when the reorder fails', async () => {
    reorderShouldFail = true;
    const user = userEvent.setup();
    renderMyOrders();

    expect(await screen.findByText(myOrders[0].orderNumber)).toBeInTheDocument();

    const [firstReorder] = screen.getAllByRole('button', { name: /reorder/i });
    await user.click(firstReorder);

    await waitFor(() => expect(reorderCalls).toEqual(['order-1']));
    expect(
      await screen.findByText(
        /Could not reorder HAO-2026-100001: Reorder is not available for this order\./
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('HAO-2026-100003')).not.toBeInTheDocument();
  });
});

describe('My Orders locked-FX display (v0.5 F3)', () => {
  it('renders the locked-FX line only for orders carrying the FX snapshot', async () => {
    renderMyOrders();

    expect(await screen.findByText(fxOrder.orderNumber)).toBeInTheDocument();
    expect(screen.getByText(myOrders[0].orderNumber)).toBeInTheDocument();

    // Exactly one FX line: the confirmed order with the snapshot. The
    // plain order renders none. Values are the fixture's, verbatim.
    const fxLines = screen.getAllByTestId('fx-rate-line');
    expect(fxLines).toHaveLength(1);
    expect(fxLines[0]).toHaveTextContent(
      'Total locked at 1 USD = 0.012 · base total 4980.00 USD'
    );
  });
});
