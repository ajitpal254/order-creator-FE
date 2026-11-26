import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { InvoicesTab } from '../components/admin/InvoicesTab';
import { server } from '../test/server';
import { API_BASE } from '../test/fixtures';

// FE-11 Invoices tab. Report figures are MSW-mocked HERE (server.use) —
// the shared handlers/fixtures files are untouched. Every figure asserted
// is the exact value the mocked reports endpoints return; the tab must
// display them verbatim, never re-aggregate them.

// Deliberately inconsistent-looking figures: totalOutstanding is NOT the
// sum of the buckets below, so a re-aggregating implementation fails.
const ageingResponse = {
  success: true,
  buckets: [
    { key: 'current', label: 'Current', amount: 111.11 },
    { key: 'overdue', label: 'Overdue', amount: 250.5 },
    { key: '1-30', label: '1-30 days', amount: 222.22 },
  ],
  totalOutstanding: 4321.75,
};

const revenueResponse = {
  success: true,
  data: { groupBy: 'buyer', totalRevenue: 9876.5, rows: [] },
};

const invoiceOrders = [
  {
    _id: 'inv-order-1',
    orderNumber: 'HAO-2026-100101',
    status: 'Submitted',
    paymentStatus: 'Unpaid',
    createdAt: '2026-11-18T09:00:00.000Z',
    totalQuantity: 100,
    totalAmount: 1250.0,
    customerDetails: {
      customerName: 'Johnathan Smith',
      businessName: 'Apex Industrial Supplies LLC',
      country: 'United States',
    },
    items: [],
  },
  {
    _id: 'inv-order-2',
    orderNumber: 'HAO-2026-100102',
    status: 'Completed',
    createdAt: '2026-11-19T09:00:00.000Z',
    totalQuantity: 40,
    totalAmount: 640.25,
    customerDetails: {
      customerName: 'Maria Garcia',
      businessName: 'Garcia Tools SA',
      country: 'Spain',
    },
    items: [],
  },
];

const mockReports = () => {
  server.use(
    http.get(`${API_BASE}/reports/receivables-ageing`, () =>
      HttpResponse.json(ageingResponse)
    ),
    http.get(`${API_BASE}/reports/revenue`, () => HttpResponse.json(revenueResponse))
  );
};

const renderTab = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <InvoicesTab
        orders={invoiceOrders}
        onViewOrder={vi.fn()}
        handleDownloadPdf={vi.fn()}
        downloadingPdfId={null}
        {...props}
      />
    </QueryClientProvider>
  );
};

describe('InvoicesTab (FE-11)', () => {
  it('renders the metric cards with the report figures exactly as returned', async () => {
    mockReports();
    renderTab();

    // Outstanding = totalOutstanding verbatim (not the bucket sum).
    expect(await screen.findByText('$4321.75')).toBeInTheDocument();
    // Overdue = the overdue bucket's amount verbatim.
    expect(screen.getByText('$250.50')).toBeInTheDocument();
    // Paid this month = the revenue endpoint's headline figure verbatim.
    expect(screen.getByText('$9876.50')).toBeInTheDocument();

    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Paid This Month')).toBeInTheDocument();
  });

  it('renders order rows with buyer, status, payment status and total', async () => {
    mockReports();
    renderTab();

    expect(await screen.findByText('HAO-2026-100101')).toBeInTheDocument();
    expect(screen.getByText('HAO-2026-100102')).toBeInTheDocument();
    expect(screen.getByText('Johnathan Smith')).toBeInTheDocument();
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
    expect(screen.getByText('$1250.00')).toBeInTheDocument();
    expect(screen.getByText('$640.25')).toBeInTheDocument();
  });

  it('overflow menu exposes View and Download PDF and fires both actions', async () => {
    mockReports();
    const onViewOrder = vi.fn();
    const handleDownloadPdf = vi.fn();
    const user = userEvent.setup();
    renderTab({ onViewOrder, handleDownloadPdf });

    const menuButton = await screen.findByRole('button', {
      name: 'Actions for HAO-2026-100101',
    });

    await user.click(menuButton);
    expect(await screen.findByRole('menuitem', { name: /View/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Download PDF/ })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /View/ }));
    expect(onViewOrder).toHaveBeenCalledTimes(1);
    expect(onViewOrder.mock.calls[0][0]._id).toBe('inv-order-1');

    await user.click(menuButton);
    await user.click(await screen.findByRole('menuitem', { name: /Download PDF/ }));
    expect(handleDownloadPdf).toHaveBeenCalledTimes(1);
    expect(handleDownloadPdf).toHaveBeenCalledWith('inv-order-1', 'HAO-2026-100101');
  });

  it('status filter chips are built from the loaded data and filter rows', async () => {
    mockReports();
    const user = userEvent.setup();
    renderTab();

    expect(await screen.findByText('HAO-2026-100101')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.queryByText('HAO-2026-100101')).not.toBeInTheDocument();
    expect(screen.getByText('HAO-2026-100102')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('HAO-2026-100101')).toBeInTheDocument();
  });
});
