import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// Display test only: the figures asserted below are the fixture values the
// mocked API returns (product basePrice / moq) plus the line and grand
// totals the app renders for them. No pricing is recomputed here beyond
// reading fixture fields.
describe('OrderCreatorPage pricing display', () => {
  it('renders the fixture product price and, after adding a line, its line + grand totals', async () => {
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

    // The configurator loads the mocked catalogue and preselects product #1.
    expect(await screen.findByText(`Selected SKU: ${product.sku}`)).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: new RegExp(`${product.name}.*Base \\$${product.basePrice.toFixed(2)}`),
      })
    ).toBeInTheDocument();

    // Quantity + unit price default from the fixture (moq / basePrice).
    // (The page's labels are not htmlFor-associated, so select the two
    // number inputs in DOM order: quantity first, then FOB price.)
    const [qtyInput, priceInput] = container.querySelectorAll('input[type="number"]');
    expect(qtyInput).toHaveValue(product.moq);
    expect(priceInput).toHaveValue(product.basePrice);

    await user.click(screen.getByRole('button', { name: /add line item/i }));

    // Line total and grand total rendered for the fixture line:
    // moq (100) pcs at the fixture basePrice ($12.50) = $1250.00, read
    // straight off the fixture fields. Both the line-total cell and the
    // Grand Total (FOB) figure render this value.
    const expectedLineTotal = `$${(product.moq * product.basePrice).toFixed(2)}`;
    expect((await screen.findAllByText(expectedLineTotal)).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(`$${product.basePrice.toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText('Grand Total (FOB)')).toBeInTheDocument();
  });
});
