import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { OrderProvider } from '../context/OrderContext';
import { OrderCreatorPage } from '../pages/order/OrderCreatorPage';
import { products } from '../test/fixtures';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// FE-12: duplicate-line behaviour. Duplicating clones the line directly
// below the original as its own editable row (it must NOT merge into
// the original the way addItem merges identical variants).
describe('OrderCreatorPage duplicate line (FE-12)', () => {
  it('clones a line below the original and the clone edits independently', async () => {
    const user = userEvent.setup();
    const product = products[0];

    const { container } = render(
      <MemoryRouter initialEntries={['/order-creator']}>
        <AuthProvider>
          <OrderProvider>
            <OrderCreatorPage />
          </OrderProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(`Selected SKU: ${product.sku}`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add line item/i }));

    const rows = () => container.querySelectorAll('tbody tr');
    await waitFor(() => expect(rows()).toHaveLength(1));

    await user.click(
      screen.getByRole('button', { name: new RegExp(`duplicate line 1`, 'i') })
    );

    await waitFor(() => expect(rows()).toHaveLength(2));

    // Both rows are the same product/line, clone directly below.
    const qtyInputs = () =>
      [...rows()].map((r) => r.querySelector('input[type="number"]'));
    expect(qtyInputs()[0]).toHaveValue(product.moq);
    expect(qtyInputs()[1]).toHaveValue(product.moq);
    expect(rows()[1].textContent).toContain(product.name);

    // The clone is an independent line: editing its quantity leaves the
    // original untouched.
    await user.clear(qtyInputs()[1]);
    await user.type(qtyInputs()[1], '5');
    expect(qtyInputs()[0]).toHaveValue(product.moq);
    expect(qtyInputs()[1]).toHaveValue(5);
  });
});
