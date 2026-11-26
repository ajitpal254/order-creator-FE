import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { API_BASE, attributes, products } from '../test/fixtures';
import { AuthProvider } from '../context/AuthContext';
import { OrderProvider } from '../context/OrderContext';
import { useProductForm } from '../hooks/useProductForm';
import { ProductModal } from '../components/admin/ProductModal';
import { CatalogPage } from '../pages/catalog/CatalogPage';
import { OrderCreatorPage } from '../pages/order/OrderCreatorPage';
import { BuyerOrderCard } from '../components/buyer/BuyerOrderCard';
import { OrderSuccessModal } from '../components/order/OrderSuccessModal';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// FEAT-09 fixtures: products/orders carrying the new inventory fields.
// Defined locally (same pattern as buyer-dashboard.test.jsx) so the
// shared fixtures file stays untouched for parallel workstreams.
const stockedProduct = {
  ...products[0],
  leadTimeDays: 21,
  stockQuantity: 350,
  availabilityNote: 'Ready stock in Ludhiana warehouse',
};

const outOfStockProduct = {
  ...products[1],
  leadTimeDays: 45,
  stockQuantity: 0,
  availabilityNote: '',
};

const inputForLabel = (labelText) => {
  const label = screen.getByText(labelText);
  const input = label.closest('.form-group')?.querySelector('input');
  if (!input) throw new Error(`No input found for label "${labelText}"`);
  return input;
};

// ---------------------------------------------------------------------------
// 1. Admin product form
// ---------------------------------------------------------------------------

const AdminFormHarness = ({ editProduct = null }) => {
  const form = useProductForm({ setProducts: vi.fn(), showToast: vi.fn() });
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (editProduct) {
            form.setEditingProduct(editProduct);
            // Same population path as ProductsTab's Edit button.
            form.setProductForm({ ...editProduct });
          }
          form.setIsProductModalOpen(true);
        }}
      >
        {editProduct ? 'Edit product' : 'Add product'}
      </button>
      <ProductModal {...form} attributes={attributes} />
    </>
  );
};

describe('Admin product form (FEAT-09)', () => {
  it('renders the three inventory fields and sends them on create', async () => {
    let createForm = null;
    server.use(
      http.post(`${API_BASE}/products`, async ({ request }) => {
        createForm = await request.formData();
        return HttpResponse.json({ success: true, data: { _id: 'prod-new' } });
      })
    );
    const user = userEvent.setup();
    render(<AdminFormHarness />);

    await user.click(screen.getByRole('button', { name: 'Add product' }));

    // All three new fields render next to the existing ones.
    expect(screen.getByText('Lead Time (days)')).toBeInTheDocument();
    expect(screen.getByText('Stock Quantity')).toBeInTheDocument();
    expect(screen.getByText('Availability Note')).toBeInTheDocument();

    fireEvent.change(inputForLabel('Product Name *'), {
      target: { value: 'New Test Tool' },
    });
    fireEvent.change(inputForLabel('SKU / Item Code *'), {
      target: { value: 'HAO-NEW-001' },
    });
    fireEvent.change(inputForLabel('Lead Time (days)'), {
      target: { value: '21' },
    });
    fireEvent.change(inputForLabel('Stock Quantity'), {
      target: { value: '350' },
    });
    fireEvent.change(inputForLabel('Availability Note'), {
      target: { value: 'Ready stock in Ludhiana warehouse' },
    });

    await user.click(screen.getByRole('button', { name: 'Create Product' }));

    await waitFor(() => expect(createForm).not.toBeNull());
    expect(createForm.get('leadTimeDays')).toBe('21');
    expect(createForm.get('stockQuantity')).toBe('350');
    expect(createForm.get('availabilityNote')).toBe(
      'Ready stock in Ludhiana warehouse'
    );
    // Existing fields still go out as before.
    expect(createForm.get('moq')).toBe('50');
  });

  it('populates the inventory fields when editing and sends them on update', async () => {
    let updateForm = null;
    server.use(
      http.put(`${API_BASE}/products/:id`, async ({ request }) => {
        updateForm = await request.formData();
        return HttpResponse.json({ success: true, data: stockedProduct });
      })
    );
    const user = userEvent.setup();
    render(<AdminFormHarness editProduct={stockedProduct} />);

    await user.click(screen.getByRole('button', { name: 'Edit product' }));

    expect(inputForLabel('Lead Time (days)')).toHaveValue(21);
    expect(inputForLabel('Stock Quantity')).toHaveValue(350);
    expect(inputForLabel('Availability Note')).toHaveValue(
      'Ready stock in Ludhiana warehouse'
    );

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(updateForm).not.toBeNull());
    expect(updateForm.get('leadTimeDays')).toBe('21');
    expect(updateForm.get('stockQuantity')).toBe('350');
    expect(updateForm.get('availabilityNote')).toBe(
      'Ready stock in Ludhiana warehouse'
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Catalog cards
// ---------------------------------------------------------------------------

const renderCatalog = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/catalog']}>
        <OrderProvider>
          <CatalogPage />
        </OrderProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('CatalogPage inventory hints (FEAT-09)', () => {
  it('shows MOQ, lead time, stock and availability note when present', async () => {
    server.use(
      http.get(`${API_BASE}/products`, () =>
        HttpResponse.json({
          success: true,
          data: [stockedProduct, outOfStockProduct],
        })
      )
    );
    renderCatalog();

    expect(
      await screen.findByText(stockedProduct.name)
    ).toBeInTheDocument();
    expect(screen.getByText('Lead time: 21 days')).toBeInTheDocument();
    expect(screen.getByText('In stock: 350 pcs')).toBeInTheDocument();
    expect(
      screen.getByText('Ready stock in Ludhiana warehouse')
    ).toBeInTheDocument();
    // The existing MOQ badge is unchanged.
    expect(screen.getByText('MOQ: 100 pcs')).toBeInTheDocument();

    // stockQuantity 0 is a real value, not "absent": it renders Out of stock.
    expect(screen.getByText('Lead time: 45 days')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('hides lead time / availability when the product does not carry them', async () => {
    // Default MSW products fixture carries none of the new fields.
    renderCatalog();

    expect(await screen.findByText(products[0].name)).toBeInTheDocument();
    expect(screen.queryByText(/Lead time:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/In stock:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Out of stock')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Order creator below-MOQ warnings (display only)
// ---------------------------------------------------------------------------

const renderOrderCreator = () =>
  render(
    <MemoryRouter initialEntries={['/order-creator']}>
      <AuthProvider>
        <OrderProvider>
          <OrderCreatorPage />
        </OrderProvider>
      </AuthProvider>
    </MemoryRouter>
  );

describe('Order creator MOQ hints (FEAT-09)', () => {
  it('warns in the configurator and on the sheet line only when quantity < MOQ', async () => {
    server.use(
      http.get(`${API_BASE}/products`, () =>
        HttpResponse.json({ success: true, data: [stockedProduct] })
      )
    );
    const user = userEvent.setup();
    const { container } = renderOrderCreator();

    expect(
      await screen.findByText(`Selected SKU: ${stockedProduct.sku}`)
    ).toBeInTheDocument();

    // Lead-time hints show for the selected product (configurator + preview).
    expect(screen.getAllByText('Lead time: 21 days').length).toBeGreaterThan(0);

    // Quantity defaults to the product MOQ (100): no warning anywhere.
    expect(screen.queryByText(/Below MOQ/)).not.toBeInTheDocument();

    // Drop the configurator quantity below MOQ -> warning appears.
    fireEvent.change(inputForLabel('Quantity (Pieces) *'), {
      target: { value: '40' },
    });
    expect(
      screen.getByText('Below MOQ (min 100 pcs)')
    ).toBeInTheDocument();

    // Display only: the line still adds, with the quantity untouched.
    await user.click(screen.getByRole('button', { name: /add line item/i }));
    await waitFor(() =>
      expect(container.querySelectorAll('tbody tr')).toHaveLength(1)
    );
    const row = container.querySelector('tbody tr');
    expect(row.textContent).toContain('MOQ: 100 pcs');
    expect(row.textContent).toContain('Lead time: 21 days');
    expect(row.textContent).toContain('Below MOQ (min 100 pcs)');

    // Raise the line quantity to the MOQ -> the sheet warning clears.
    fireEvent.change(row.querySelector('input[type="number"]'), {
      target: { value: '100' },
    });
    await waitFor(() =>
      expect(row.textContent).not.toContain('Below MOQ')
    );
    expect(row.textContent).toContain('MOQ: 100 pcs');
  });
});

// ---------------------------------------------------------------------------
// 4. Estimated ship date on order views
// ---------------------------------------------------------------------------

const shipDateOrder = {
  _id: 'order-ship-1',
  orderNumber: 'HAO-2026-100201',
  status: 'In Production',
  createdAt: '2026-11-20T10:30:00.000Z',
  totalQuantity: 200,
  totalAmount: 2500.0,
  // Midday UTC so the en-US local rendering is Dec 15 in every timezone.
  estimatedShipDate: '2026-12-15T12:00:00.000Z',
  items: [],
};

describe('Estimated ship date (FEAT-09)', () => {
  it('shows the formatted date on the buyer order card when present', () => {
    render(
      <MemoryRouter>
        <BuyerOrderCard order={shipDateOrder} />
      </MemoryRouter>
    );
    expect(
      screen.getByText('Estimated ship date: Dec 15, 2026')
    ).toBeInTheDocument();
  });

  it('renders nothing on the buyer order card when absent', () => {
    const { estimatedShipDate, ...withoutShipDate } = shipDateOrder;
    render(
      <MemoryRouter>
        <BuyerOrderCard order={withoutShipDate} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Estimated ship date/)).not.toBeInTheDocument();
  });

  it('shows the formatted date in the order success modal when present', () => {
    render(
      <MemoryRouter>
        <OrderSuccessModal
          orderSuccessModal={{
            ...shipDateOrder,
            customerDetails: {
              customerName: 'Johnathan Smith',
              businessName: 'Apex Industrial Supplies LLC',
            },
            estimatedWeightKg: 100,
          }}
          setOrderSuccessModal={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Estimated ship date:')).toBeInTheDocument();
    expect(screen.getByText('Dec 15, 2026')).toBeInTheDocument();
  });

  it('renders nothing in the order success modal when absent', () => {
    const { estimatedShipDate, ...withoutShipDate } = shipDateOrder;
    render(
      <MemoryRouter>
        <OrderSuccessModal
          orderSuccessModal={{
            ...withoutShipDate,
            customerDetails: {
              customerName: 'Johnathan Smith',
              businessName: 'Apex Industrial Supplies LLC',
            },
            estimatedWeightKg: 100,
          }}
          setOrderSuccessModal={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Estimated ship date/)).not.toBeInTheDocument();
  });
});
