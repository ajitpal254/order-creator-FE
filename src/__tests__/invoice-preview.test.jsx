import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { MyOrdersPage } from '../pages/orders/MyOrdersPage';
import { myOrders } from '../test/fixtures';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// FE-10 split-pane preview: every figure asserted is a fixture value from
// the order object, rendered by the paper preview exactly as returned
// (toFixed formatting only — nothing is recomputed).
describe('MyOrdersPage invoice paper preview (FE-10)', () => {
  const renderPage = () => {
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

  it('renders the fixture figures exactly in the paper preview when expanded', async () => {
    const user = userEvent.setup();
    const order = myOrders[0];
    const item = order.items[0];

    renderPage();

    expect(await screen.findByText(order.orderNumber)).toBeInTheDocument();
    await user.click(screen.getByText(order.orderNumber));

    const preview = await screen.findByTestId('invoice-preview');
    const inPreview = within(preview);

    // Order number and line item identity, straight from the order object.
    expect(inPreview.getByText(order.orderNumber)).toBeInTheDocument();
    expect(
      inPreview.getByText(`${item.productName} · ${item.sku}`)
    ).toBeInTheDocument();

    // Line figures exactly as returned: qty, unit price, line amount.
    expect(inPreview.getByText(String(item.quantity))).toBeInTheDocument();
    expect(inPreview.getByText(item.unitPrice.toFixed(2))).toBeInTheDocument();
    // The line amount and the grand total are the same fixture figure, so
    // it appears twice in the preview (amount column + total row).
    expect(inPreview.getAllByText(item.totalPrice.toFixed(2))).toHaveLength(2);
    expect(inPreview.getByText('Total (USD)')).toBeInTheDocument();
  });

  it('shows the sticky totals bar and the lifecycle timeline from order.timeline', async () => {
    const user = userEvent.setup();
    const order = myOrders[0];
    const tl = order.timeline[0];

    renderPage();

    expect(await screen.findByText(order.orderNumber)).toBeInTheDocument();
    await user.click(screen.getByText(order.orderNumber));

    // Sticky totals bar carries totalAmount exactly as returned.
    expect(await screen.findByText('Order Total (FOB)')).toBeInTheDocument();
    expect(screen.getAllByText(`$${order.totalAmount.toFixed(2)} USD`).length).toBeGreaterThan(0);

    // Lifecycle timeline entry from order.timeline[].
    expect(screen.getByText(tl.status)).toBeInTheDocument();
    expect(screen.getByText(`— ${tl.note}`)).toBeInTheDocument();
  });

  it('exposes Details | Invoice tabs for the mobile collapsed layout', async () => {
    const user = userEvent.setup();
    const order = myOrders[0];

    renderPage();

    expect(await screen.findByText(order.orderNumber)).toBeInTheDocument();
    await user.click(screen.getByText(order.orderNumber));

    const detailsTab = await screen.findByRole('tab', { name: 'Details' });
    const invoiceTab = screen.getByRole('tab', { name: 'Invoice' });
    expect(detailsTab).toHaveAttribute('aria-selected', 'true');
    expect(invoiceTab).toHaveAttribute('aria-selected', 'false');

    await user.click(invoiceTab);
    expect(invoiceTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('invoice-preview')).toBeInTheDocument();
  });
});
