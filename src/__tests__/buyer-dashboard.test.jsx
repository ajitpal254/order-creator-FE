import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { API_BASE, adminUser } from '../test/fixtures';
import { AuthProvider } from '../context/AuthContext';
import { orderApi } from '../api/client';
import { BuyerDashboard } from '../pages/buyer/BuyerDashboard';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// Local order fixtures for the buyer dashboard (FE-13). Defined here —
// NOT in src/test/fixtures.js — because parallel workstreams share that
// file. Every figure asserted below is a value from these fixtures,
// i.e. exactly what the mocked API returned; the dashboard must render
// them verbatim and never recompute pricing/tax.
const lineItem = {
  product: 'prod-1',
  productName: 'Combination Spanner Set 14pc',
  sku: 'HAO-CS-014',
  size: '8-19mm',
  finish: 'Chrome Plated',
  color: 'Industrial Red',
  brand: 'H.A. Overseas',
  packaging: 'Master Carton (Standard Export)',
  customMarking: '',
  quantity: 200,
  unitPrice: 12.5,
  totalPrice: 2500.0,
  snapshot: { weightKg: 0.5, pcsPerCarton: 20 },
};

const activeOrder = {
  _id: 'order-active-1',
  orderNumber: 'HAO-2026-100101',
  status: 'In Production',
  createdAt: '2026-11-20T10:30:00.000Z',
  totalQuantity: 200,
  totalAmount: 2500.0,
  shippingMarks: 'APEX / LOT 44',
  specialInstructions: 'Export seaworthy cartons.',
  items: [lineItem],
};

const draftOrder = {
  _id: 'order-draft-1',
  orderNumber: 'HAO-2026-100102',
  status: 'Draft',
  createdAt: '2026-11-22T09:00:00.000Z',
  totalQuantity: 200,
  totalAmount: 2500.0,
  shippingMarks: 'APEX / LOT 45',
  items: [lineItem],
};

// Invoice figures live on the order's embedded invoice summary exactly
// as the API returns them: status 'partial', $500 paid of a $2000
// invoice, $1500 balance due. The dashboard displays, never derives.
const unpaidInvoiceOrder = {
  _id: 'order-unpaid-1',
  orderNumber: 'HAO-2026-100103',
  status: 'Confirmed',
  createdAt: '2026-11-18T08:15:00.000Z',
  totalQuantity: 160,
  totalAmount: 2000.0,
  shippingMarks: 'APEX / LOT 46',
  items: [{ ...lineItem, quantity: 160, totalPrice: 2000.0 }],
  invoice: {
    invoiceId: 'INV-2026-0501',
    status: 'partial',
    amountPaid: 500.0,
    balanceDue: 1500.0,
    isPending: false,
  },
};

const completedOrder = {
  _id: 'order-done-1',
  orderNumber: 'HAO-2026-100104',
  status: 'Completed',
  createdAt: '2026-10-05T12:00:00.000Z',
  totalQuantity: 200,
  totalAmount: 2500.0,
  shippingMarks: 'APEX / LOT 40',
  specialInstructions: 'Export seaworthy cartons.',
  items: [lineItem],
};

const myOrdersHandler = (orders) =>
  http.get(`${API_BASE}/orders/my-orders`, () =>
    HttpResponse.json({ success: true, data: orders })
  );

const renderDashboard = () => {
  // A stored token makes AuthProvider restore the buyer via GET
  // /auth/me (default MSW handler returns the buyer fixture user).
  localStorage.setItem('hao_token', 'access-token-1');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<BuyerDashboard />} />
            <Route path="/order-creator" element={<div>Order Creator Stub</div>} />
            <Route path="/my-orders" element={<div>My Orders Stub</div>} />
            <Route path="/admin" element={<div>Admin Stub</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const sectionFor = async (heading) =>
  (await screen.findByRole('heading', { name: heading })).closest('section');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BuyerDashboard (FE-13)', () => {
  it('renders active orders with status chips and API totals', async () => {
    server.use(myOrdersHandler([activeOrder, completedOrder]));
    renderDashboard();

    const active = await sectionFor(/active orders/i);
    expect(
      await within(active).findByText(activeOrder.orderNumber)
    ).toBeInTheDocument();
    expect(within(active).getByText('In Production')).toBeInTheDocument();
    // Total rendered exactly as the API returned it.
    expect(
      within(active).getByText(`$${activeOrder.totalAmount.toFixed(2)} USD`)
    ).toBeInTheDocument();
    // A Completed order is terminal — not an active order.
    expect(
      within(active).queryByText(completedOrder.orderNumber)
    ).not.toBeInTheDocument();
  });

  it('shows a Draft order and an unpaid-invoice order in Awaiting your action, figures display-only', async () => {
    const pdfSpy = vi
      .spyOn(orderApi, 'downloadPdf')
      .mockResolvedValue(undefined);
    server.use(myOrdersHandler([draftOrder, unpaidInvoiceOrder]));
    const user = userEvent.setup();
    renderDashboard();

    const awaiting = await sectionFor(/awaiting your action/i);

    // (i) Draft order awaiting submission.
    expect(
      await within(awaiting).findByText(draftOrder.orderNumber)
    ).toBeInTheDocument();
    expect(within(awaiting).getByText('Draft')).toBeInTheDocument();
    expect(
      within(awaiting).getByRole('link', { name: /continue in order creator/i })
    ).toBeInTheDocument();

    // (iii) Unpaid / partially-paid invoice: figures exactly as returned.
    expect(
      within(awaiting).getByText(unpaidInvoiceOrder.orderNumber)
    ).toBeInTheDocument();
    expect(
      within(awaiting).getByText(/INV-2026-0501/)
    ).toBeInTheDocument();
    expect(within(awaiting).getByText('$1500.00 USD')).toBeInTheDocument();
    expect(within(awaiting).getByText('$500.00 USD')).toBeInTheDocument();

    // The only invoice action is the existing PDF download flow.
    await user.click(
      within(awaiting).getByRole('button', { name: 'Invoice PDF' })
    );
    expect(pdfSpy).toHaveBeenCalledWith(
      unpaidInvoiceOrder._id,
      unpaidInvoiceOrder.orderNumber
    );
  });

  it('order again posts a create with copied items and navigates to the order creator', async () => {
    let createBody = null;
    server.use(
      myOrdersHandler([completedOrder]),
      http.post(`${API_BASE}/orders`, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({
          success: true,
          order: { ...draftOrder, _id: 'order-clone-1' },
        });
      })
    );
    const user = userEvent.setup();
    renderDashboard();

    const again = await sectionFor(/order again/i);
    expect(
      await within(again).findByText(completedOrder.orderNumber)
    ).toBeInTheDocument();

    await user.click(within(again).getByRole('button', { name: 'Order again' }));

    // Lands in the order creator on the new draft.
    expect(await screen.findByText('Order Creator Stub')).toBeInTheDocument();

    // The create call cloned the past order as a NEW Draft, items copied
    // field-for-field in the order creator's create-payload shape.
    expect(createBody).not.toBeNull();
    expect(createBody.status).toBe('Draft');
    expect(createBody.shippingMarks).toBe(completedOrder.shippingMarks);
    expect(createBody.items).toHaveLength(1);
    expect(createBody.items[0]).toMatchObject({
      product: lineItem.product,
      productName: lineItem.productName,
      sku: lineItem.sku,
      size: lineItem.size,
      finish: lineItem.finish,
      color: lineItem.color,
      brand: lineItem.brand,
      packaging: lineItem.packaging,
      quantity: lineItem.quantity,
      unitPrice: lineItem.unitPrice,
      totalPrice: lineItem.totalPrice,
      weightKg: lineItem.snapshot.weightKg,
      pcsPerCarton: lineItem.snapshot.pcsPerCarton,
    });
  });

  it('shows a visible error when order again fails', async () => {
    server.use(
      myOrdersHandler([completedOrder]),
      http.post(`${API_BASE}/orders`, () =>
        HttpResponse.json(
          { success: false, message: 'Clone rejected by server' },
          { status: 500 }
        )
      )
    );
    const user = userEvent.setup();
    renderDashboard();

    const again = await sectionFor(/order again/i);
    await within(again).findByText(completedOrder.orderNumber);
    await user.click(within(again).getByRole('button', { name: 'Order again' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not create a new draft/i
    );
    // Still on the dashboard — no navigation happened.
    expect(screen.queryByText('Order Creator Stub')).not.toBeInTheDocument();
  });

  it('renders empty states for each section when the buyer has no orders', async () => {
    server.use(myOrdersHandler([]));
    renderDashboard();

    expect(
      await screen.findByText(/nothing needs your attention/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/no active orders/i)).toBeInTheDocument();
    expect(screen.getByText(/no past orders to reorder/i)).toBeInTheDocument();
  });

  it('renders an error state with retry when orders fail to load', async () => {
    server.use(
      http.get(`${API_BASE}/orders/my-orders`, () =>
        HttpResponse.json(
          { success: false, message: 'Server unavailable' },
          { status: 500 }
        )
      )
    );
    renderDashboard();

    expect(
      await screen.findByText(/failed to load your dashboard/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('shows staff users a pointer to the admin dashboard instead of buyer data', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ success: true, user: adminUser })
      ),
      myOrdersHandler([activeOrder])
    );
    renderDashboard();

    expect(
      await screen.findByText(/this dashboard is for buyer accounts/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(activeOrder.orderNumber)).not.toBeInTheDocument();
  });
});
