import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { KanbanBoard } from '../components/admin/KanbanBoard';
import { AuditLogTab } from '../components/admin/AuditLogTab';
import { CustomersTab } from '../components/admin/CustomersTab';
import { InvoicesTab } from '../components/admin/InvoicesTab';
import { OrdersTab } from '../components/admin/OrdersTab';
import { server } from '../test/server';
import { API_BASE, adminOrdersV09, auditLogsV09, customersV09 } from '../test/fixtures';
import { ordersToCsv } from '../lib/adminConsole';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('KanbanBoard (v0.9 F1)', () => {
  it('renders columns per status and cards with order number, buyer, total', () => {
    render(<KanbanBoard orders={adminOrdersV09} setOrders={vi.fn()} showToast={vi.fn()} />);
    expect(screen.getByLabelText('Submitted column')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmed column')).toBeInTheDocument();
    expect(screen.getByLabelText('In Production column')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancelled column')).toBeInTheDocument();
    expect(screen.getByText('HAO-2026-100201')).toBeInTheDocument();
    expect(screen.getByText('Johnathan Smith')).toBeInTheDocument();
    expect(screen.getByText('$1500.00')).toBeInTheDocument();
    expect(screen.getByText('HAO-2026-100202')).toBeInTheDocument();
  });

  it('moving a card issues PATCH /orders/:id/status and updates the board', async () => {
    const calls = [];
    server.use(http.patch(`${API_BASE}/orders/:id/status`, async ({ request, params }) => {
      const body = await request.json();
      calls.push({ id: params.id, body });
      return HttpResponse.json({ success: true, data: { _id: params.id, status: body.status } });
    }));
    const user = userEvent.setup();
    // Stateful harness mimicking AdminDashboard's setOrders
    const Harness = () => {
      const [orders, setOrders] = React.useState(adminOrdersV09);
      return <KanbanBoard orders={orders} setOrders={setOrders} showToast={vi.fn()} />;
    };
    render(<Harness />);
    await user.selectOptions(screen.getByLabelText('Move HAO-2026-100201 to status'), 'Confirmed');
    await user.click(screen.getAllByRole('button', { name: 'Move' })[0]);
    expect(calls).toHaveLength(1);
    expect(calls[0].id).toBe('order-v09-1');
    expect(calls[0].body.status).toBe('Confirmed');
    // Card now appears twice? No — it moved: Submitted column no longer contains it
    const submittedCol = screen.getByLabelText('Submitted column');
    expect(within(submittedCol).queryByText('HAO-2026-100201')).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Confirmed column')).getByText('HAO-2026-100201')).toBeInTheDocument();
  });

  it('bulk update issues a PATCH per selected order and reports results', async () => {
    const calls = [];
    server.use(http.patch(`${API_BASE}/orders/:id/status`, async ({ request, params }) => {
      const body = await request.json();
      calls.push({ id: params.id, body });
      if (params.id === 'order-v09-2') return HttpResponse.json({ success: false, message: 'Invalid transition' }, { status: 400 });
      return HttpResponse.json({ success: true });
    }));
    const user = userEvent.setup();
    render(<KanbanBoard orders={adminOrdersV09} setOrders={vi.fn()} showToast={vi.fn()} />);
    await user.click(screen.getByLabelText('Select order HAO-2026-100201'));
    await user.click(screen.getByLabelText('Select order HAO-2026-100202'));
    await user.selectOptions(screen.getByLabelText('Bulk target status'), 'Completed');
    await user.click(screen.getByRole('button', { name: 'Apply Bulk Status' }));
    expect(await screen.findByText(/1 succeeded, 1 failed/)).toBeInTheDocument();
    expect(screen.getByText(/HAO-2026-100202: Invalid transition/)).toBeInTheDocument();
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.body.status === 'Completed')).toBe(true);
  });

  it('saved filters persist to localStorage, apply and delete', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard orders={adminOrdersV09} setOrders={vi.fn()} showToast={vi.fn()} />);
    await user.type(screen.getByLabelText('Search orders'), 'Maria');
    await user.type(screen.getByLabelText('Saved filter name'), 'Maria only');
    await user.click(screen.getByRole('button', { name: 'Save Filter' }));
    const stored = JSON.parse(localStorage.getItem('hao_saved_order_filters'));
    expect(stored).toEqual([{ name: 'Maria only', search: 'Maria' }]);
    // Clear search, then apply saved filter
    await user.clear(screen.getByLabelText('Search orders'));
    expect(screen.getByText('HAO-2026-100201')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Maria only' }));
    expect(screen.queryByText('HAO-2026-100201')).not.toBeInTheDocument();
    expect(screen.getByText('HAO-2026-100202')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete saved filter Maria only' }));
    expect(JSON.parse(localStorage.getItem('hao_saved_order_filters'))).toEqual([]);
  });

  it('CSV export downloads the filtered orders (ordersToCsv + OrdersTab button)', async () => {
    const csv = ordersToCsv(adminOrdersV09);
    expect(csv).toContain('HAO-2026-100201');
    expect(csv).toContain('1500.00');
    expect(csv.split('\n')[0]).toContain('Order Number');

    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<OrdersTab orders={adminOrdersV09} setOrders={vi.fn()} setSelectedOrderForStatus={vi.fn()} setNewStatus={vi.fn()} handleDownloadPdf={vi.fn()} downloadingPdfId={null} showToast={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});

describe('AuditLogTab (v0.9 F1)', () => {
  it('renders entries and filters by action and entityType', async () => {
    const seen = [];
    server.use(http.get(`${API_BASE}/admin/audit-logs`, ({ request }) => {
      const url = new URL(request.url);
      seen.push({ action: url.searchParams.get('action'), entityType: url.searchParams.get('entityType') });
      let data = auditLogsV09;
      const a = url.searchParams.get('action');
      const e = url.searchParams.get('entityType');
      if (a) data = data.filter((x) => x.action.includes(a));
      if (e) data = data.filter((x) => x.entityType === e);
      return HttpResponse.json({ success: true, count: data.length, total: data.length, page: 1, limit: 50, data });
    }));
    const user = userEvent.setup();
    render(<AuditLogTab />);
    expect(await screen.findByText('order.status_updated')).toBeInTheDocument();
    expect(screen.getByText('user.role_changed')).toBeInTheDocument();
    expect(screen.getByText('H.A. Overseas Admin')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Filter by action'), 'user.role_changed');
    await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
    expect(await screen.findByText('user.role_changed')).toBeInTheDocument();
    expect(screen.queryByText('order.status_updated')).not.toBeInTheDocument();
    expect(seen.some((s) => s.action === 'user.role_changed')).toBe(true);
  });
});

describe('CustomersTab role management (v0.9 F1)', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('role change fires confirm + PATCH /api/users/:id/role', async () => {
    const calls = [];
    server.use(http.patch(`${API_BASE}/users/:id/role`, async ({ request, params }) => {
      calls.push({ id: params.id, body: await request.json() });
      return HttpResponse.json({ success: true });
    }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<CustomersTab customers={customersV09} showToast={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText('Role for Johnathan Smith'), 'admin');
    expect(window.confirm).toHaveBeenCalled();
    expect(calls).toEqual([{ id: 'user-buyer-1', body: { role: 'admin' } }]);
    expect(await screen.findByText(/updated to admin/)).toBeInTheDocument();
  });

  it('does not PATCH when confirm is declined', async () => {
    const calls = [];
    server.use(http.patch(`${API_BASE}/users/:id/role`, async () => { calls.push(1); return HttpResponse.json({ success: true }); }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<CustomersTab customers={customersV09} showToast={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText('Role for Johnathan Smith'), 'admin');
    expect(calls).toHaveLength(0);
  });
});

describe('InvoicesTab GST (v0.9 F1)', () => {
  const mockReports = () => server.use(
    http.get(`${API_BASE}/reports/receivables-ageing`, () => HttpResponse.json({ success: true, buckets: [], totalOutstanding: 0 })),
    http.get(`${API_BASE}/reports/revenue`, () => HttpResponse.json({ success: true, data: { totalRevenue: 0 } })),
  );
  const ordersWithInvoice = [{ ...adminOrdersV09[0], invoiceId: 'inv-1', paymentStatus: 'Unpaid' }];

  it('View GST QR shows payload and record in a modal', async () => {
    mockReports();
    server.use(http.get(`${API_BASE}/invoices/:id/gst-qr`, ({ params }) => {
      expect(params.id).toBe('inv-1');
      return HttpResponse.json({ success: true, payload: 'gst-qr-payload-string', record: { invoiceNumber: 'INV-001', irn: '' } });
    }));
    const user = userEvent.setup();
    wrap(<InvoicesTab orders={ordersWithInvoice} onViewOrder={vi.fn()} handleDownloadPdf={vi.fn()} downloadingPdfId={null} />);
    await user.click(await screen.findByRole('button', { name: 'Actions for HAO-2026-100201' }));
    await user.click(await screen.findByRole('menuitem', { name: /GST QR Payload/ }));
    expect(await screen.findByText('gst-qr-payload-string')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });

  it('Generate IRN handles 501 GSP_NOT_CONFIGURED with a clear message', async () => {
    mockReports();
    server.use(http.post(`${API_BASE}/invoices/:id/irn`, () => HttpResponse.json({ success: false, code: 'GSP_NOT_CONFIGURED', message: 'No GSP' }, { status: 501 })));
    const user = userEvent.setup();
    wrap(<InvoicesTab orders={ordersWithInvoice} onViewOrder={vi.fn()} handleDownloadPdf={vi.fn()} downloadingPdfId={null} />);
    await user.click(await screen.findByRole('button', { name: 'Actions for HAO-2026-100201' }));
    await user.click(await screen.findByRole('menuitem', { name: /Generate IRN/ }));
    expect(await screen.findByText('GST provider not configured')).toBeInTheDocument();
  });
});
