import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { OrderProvider } from '../context/OrderContext';
import { OrderCreatorPage } from '../pages/order/OrderCreatorPage';
import { myOrders, products, templates } from '../test/fixtures';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/order-creator']}>
      <AuthProvider>
        <OrderProvider>
          <OrderCreatorPage />
        </OrderProvider>
      </AuthProvider>
    </MemoryRouter>
  );

// FE-12: bulk import + templates integration against the MSW fixtures.
describe('OrderCreatorPage bulk import (FE-12)', () => {
  it('validates rows before applying and imports only the valid ones', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    expect(
      await screen.findByText(`Selected SKU: ${products[0].sku}`)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /bulk import/i }));
    const textarea = screen.getByLabelText(/csv rows/i);
    fireEvent.change(textarea, {
      target: { value: 'HAO-GG-400, 50\nUnknown Widget, 10\nHAO-CS-014, nope' },
    });

    // Per-row validation is visible BEFORE anything is applied.
    expect(await screen.findByText(/unknown product "Unknown Widget"/i)).toBeInTheDocument();
    expect(screen.getByText(/invalid quantity "nope"/i)).toBeInTheDocument();
    expect(screen.getByText(/Lever Grease Gun 400cc \(HAO-GG-400\) × 50/)).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /import 1 valid row/i }));

    // Only the valid row landed on the sheet.
    await waitFor(() =>
      expect(container.querySelectorAll('tbody tr')).toHaveLength(1)
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].textContent).toContain('Lever Grease Gun 400cc');
    expect(screen.getByText(/bulk import complete: 1 row/i)).toBeInTheDocument();
  });
});

describe('OrderCreatorPage templates (FE-12)', () => {
  it('uses a template: create-order result loads into the creator for editing', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    expect(
      await screen.findByText(`Selected SKU: ${products[0].sku}`)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^templates$/i }));
    expect(await screen.findByText(templates[0].name)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /use template/i }));

    // The created order's items + shipping marks are loaded into the sheet.
    expect(
      await screen.findByText(/applied: the created order is loaded below/i)
    ).toBeInTheDocument();
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain(myOrders[0].items[0].productName);
    expect(screen.getByDisplayValue(myOrders[0].shippingMarks)).toBeInTheDocument();
  });

  it('saves the current sheet as a named template', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByText(`Selected SKU: ${products[0].sku}`)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add line item/i }));
    await waitFor(() =>
      expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
    );

    await user.click(screen.getByRole('button', { name: /save as template/i }));
    await user.type(screen.getByLabelText(/template name/i), 'My saved template');
    await user.click(screen.getByRole('button', { name: /^save template$/i }));

    expect(
      await screen.findByText('Template "My saved template" saved.')
    ).toBeInTheDocument();
  });

  it('shows the price breakdown drawer with the existing totals figures only', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByText(`Selected SKU: ${products[0].sku}`)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add line item/i }));
    await waitFor(() =>
      expect(document.querySelectorAll('tbody tr')).toHaveLength(1)
    );

    await user.click(screen.getByRole('button', { name: /price breakdown/i }));
    const drawer = await screen.findByTestId('price-breakdown');
    // Grand total is the existing totals figure (fixture moq × basePrice).
    expect(drawer.textContent).toContain(
      `$${(products[0].moq * products[0].basePrice).toFixed(2)}`
    );
    expect(within(drawer).getByText('Grand Total (FOB)')).toBeInTheDocument();
    // No tier-discount / tax / freight line is invented.
    expect(within(drawer).queryByText(/^Tax$/)).toBeNull();
    expect(within(drawer).queryByText(/^Freight$/)).toBeNull();
    expect(within(drawer).queryByText(/^Tier Discount$/)).toBeNull();
  });
});
