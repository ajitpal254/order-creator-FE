import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// Display test only: every figure asserted is a fixture value returned by
// the mocked API (order.totalAmount, item.unitPrice, item.totalPrice).
// Invoice/order totals logic is not recomputed or altered here.
describe('MyOrdersPage invoice totals display', () => {
  it('renders the fixture order total exactly, and the line totals when expanded', async () => {
    const user = userEvent.setup();
    const order = myOrders[0];
    const item = order.items[0];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/my-orders']}>
          <AuthProvider>
            <MyOrdersPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText(order.orderNumber)).toBeInTheDocument();

    // Order-level total rendered exactly as the fixture provides it.
    expect(
      screen.getByText(`$${order.totalAmount.toFixed(2)} USD`)
    ).toBeInTheDocument();
    expect(screen.getByText(`${order.totalQuantity} pcs`)).toBeInTheDocument();

    // Expand the order and check the invoice line figures.
    await user.click(screen.getByText(order.orderNumber));

    expect(await screen.findByText(item.productName)).toBeInTheDocument();
    expect(screen.getByText(`$${item.unitPrice.toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText(`$${item.totalPrice.toFixed(2)}`)).toBeInTheDocument();
  });
});
