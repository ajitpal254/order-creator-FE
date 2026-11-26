import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { API_BASE, adminUser, buyerUser } from '../test/fixtures';
import App from '../App';
import { ReportsPage } from '../pages/admin/ReportsPage';

// Admin reports (v0.6 F3). MSW handlers are defined HERE via server.use
// — the shared src/test/handlers.js / fixtures.js are NOT edited, since
// parallel workstreams share them. Every figure asserted below is a
// value from these local fixtures, i.e. exactly what the mocked API
// returned; the page must render them verbatim and never recompute them.

const revenueByProduct = [
  { label: 'Combination Spanner Set 14pc', amount: 12500.75, count: 5 },
  { label: 'Lever Grease Gun 400cc', amount: 4875, count: 3 },
];

const revenueByBuyer = [
  { label: 'Apex Industrial Supplies LLC', amount: 9870.25, count: 4 },
  { label: 'Nordwerk GmbH', amount: 7505.5, count: 2 },
];

const revenueByCountry = [{ label: 'United States', amount: 17375.75, count: 8 }];

const ageingPayload = {
  buckets: [
    { key: '0-30', label: '0-30 days', amount: 3200.5, count: 4 },
    { key: '31-60', label: '31-60 days', amount: 1800, count: 2 },
    { key: '90+', label: '90+ days', amount: 640.25, count: 1 },
  ],
  // Deliberately NOT the sum a client might compute from any subset —
  // the page must show this returned figure, nothing derived.
  totalOutstanding: 5640.75,
};

const backlogPayload = [
  { status: 'In Production', count: 7 },
  { status: 'Submitted', count: 3 },
  { status: 'Quality Check', count: 2 },
];

// Records the query params of the most recent revenue request so tests
// can assert the groupBy switcher / date range refetch correctly.
let lastRevenueParams = null;

const reportsHandlers = () => [
  http.get(`${API_BASE}/reports/revenue`, ({ request }) => {
    const url = new URL(request.url);
    lastRevenueParams = Object.fromEntries(url.searchParams.entries());
    if (url.searchParams.get('format') === 'csv') {
      return new HttpResponse('label,amount,count\nCombination Spanner Set 14pc,12500.75,5', {
        headers: { 'Content-Type': 'text/csv' },
      });
    }
    const groupBy = url.searchParams.get('groupBy') || 'product';
    const rows =
      groupBy === 'buyer'
        ? revenueByBuyer
        : groupBy === 'country'
          ? revenueByCountry
          : revenueByProduct;
    return HttpResponse.json({ success: true, data: rows });
  }),
  http.get(`${API_BASE}/reports/receivables-ageing`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('format') === 'csv') {
      return new HttpResponse('bucket,amount,count\n0-30 days,3200.5,4', {
        headers: { 'Content-Type': 'text/csv' },
      });
    }
    return HttpResponse.json({ success: true, data: ageingPayload });
  }),
  http.get(`${API_BASE}/reports/backlog`, () =>
    HttpResponse.json({ success: true, data: backlogPayload })
  ),
];

const renderReports = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/reports']}>
        <Routes>
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin" element={<div>Admin Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const sectionFor = (name) => screen.getByRole('region', { name });

afterEach(() => {
  vi.restoreAllMocks();
  lastRevenueParams = null;
});

describe('ReportsPage (v0.6 F3)', () => {
  it('renders revenue rows exactly as the API returned them', async () => {
    server.use(...reportsHandlers());
    renderReports();

    const revenue = await screen.findByRole('region', { name: 'Revenue' });
    expect(
      await within(revenue).findByText('Combination Spanner Set 14pc')
    ).toBeInTheDocument();
    expect(within(revenue).getByText('Lever Grease Gun 400cc')).toBeInTheDocument();
    // Amounts and counts verbatim from the mocked payload.
    expect(within(revenue).getByText('12500.75')).toBeInTheDocument();
    expect(within(revenue).getByText('4875')).toBeInTheDocument();
    expect(within(revenue).getByText('5')).toBeInTheDocument();
    expect(within(revenue).getByText('3')).toBeInTheDocument();
    // Default grouping is product.
    expect(lastRevenueParams?.groupBy).toBe('product');
  });

  it('refetches revenue with the new groupBy when the switcher is used', async () => {
    server.use(...reportsHandlers());
    const user = userEvent.setup();
    renderReports();

    const revenue = sectionFor('Revenue');
    await within(revenue).findByText('Combination Spanner Set 14pc');

    await user.click(within(revenue).getByRole('button', { name: 'Buyer' }));

    expect(
      await within(revenue).findByText('Apex Industrial Supplies LLC')
    ).toBeInTheDocument();
    expect(within(revenue).getByText('9870.25')).toBeInTheDocument();
    expect(
      within(revenue).queryByText('Combination Spanner Set 14pc')
    ).not.toBeInTheDocument();
    await waitFor(() => expect(lastRevenueParams?.groupBy).toBe('buyer'));
  });

  it('sends the from/to date range with the revenue request', async () => {
    server.use(...reportsHandlers());
    renderReports();

    await screen.findByText('Combination Spanner Set 14pc');
    fireEvent.change(screen.getByLabelText('From date'), {
      target: { value: '2026-11-01' },
    });
    await waitFor(() => expect(lastRevenueParams?.from).toBe('2026-11-01'));
    fireEvent.change(screen.getByLabelText('To date'), {
      target: { value: '2026-11-30' },
    });
    await waitFor(() => expect(lastRevenueParams?.to).toBe('2026-11-30'));
  });

  it('renders ageing buckets and totalOutstanding exactly as returned', async () => {
    server.use(...reportsHandlers());
    renderReports();

    const ageing = await screen.findByRole('region', { name: 'Receivables ageing' });
    expect(await within(ageing).findByText('Total Outstanding')).toBeInTheDocument();
    // Header figure is the API's totalOutstanding, verbatim.
    expect(within(ageing).getByText('5640.75')).toBeInTheDocument();
    // Bucket labels + amounts as returned (cards and table both render
    // them, so expect at least one of each).
    expect(within(ageing).getAllByText('0-30 days').length).toBeGreaterThan(0);
    expect(within(ageing).getAllByText('3200.5').length).toBeGreaterThan(0);
    expect(within(ageing).getAllByText('31-60 days').length).toBeGreaterThan(0);
    expect(within(ageing).getAllByText('1800').length).toBeGreaterThan(0);
    expect(within(ageing).getAllByText('90+ days').length).toBeGreaterThan(0);
    expect(within(ageing).getAllByText('640.25').length).toBeGreaterThan(0);
  });

  it('renders the production backlog counts by status as returned', async () => {
    server.use(...reportsHandlers());
    renderReports();

    const backlog = await screen.findByRole('region', { name: 'Production backlog' });
    expect(await within(backlog).findByText('In Production')).toBeInTheDocument();
    expect(within(backlog).getByText('7')).toBeInTheDocument();
    expect(within(backlog).getByText('Submitted')).toBeInTheDocument();
    expect(within(backlog).getByText('3')).toBeInTheDocument();
    expect(within(backlog).getByText('Quality Check')).toBeInTheDocument();
    expect(within(backlog).getByText('2')).toBeInTheDocument();
  });

  it('downloads the revenue CSV as a blob when the CSV button is clicked', async () => {
    server.use(...reportsHandlers());
    const createObjectURL = vi.fn(() => 'blob:mock-revenue-csv');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const user = userEvent.setup();
    renderReports();

    await screen.findByText('Combination Spanner Set 14pc');
    await user.click(screen.getByRole('button', { name: /download revenue csv/i }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(anchorClick).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-revenue-csv');
    // The CSV request carried format=csv plus the current grouping.
    expect(lastRevenueParams?.format).toBe('csv');
    expect(lastRevenueParams?.groupBy).toBe('product');
  });

  it('shows a friendly error state when revenue fails to load', async () => {
    server.use(
      http.get(`${API_BASE}/reports/revenue`, () =>
        HttpResponse.json(
          { success: false, message: 'Reports unavailable' },
          { status: 500 }
        )
      ),
      http.get(`${API_BASE}/reports/receivables-ageing`, () =>
        HttpResponse.json({ success: true, data: ageingPayload })
      ),
      http.get(`${API_BASE}/reports/backlog`, () =>
        HttpResponse.json({ success: true, data: backlogPayload })
      )
    );
    renderReports();

    expect(await screen.findByText(/failed to load revenue/i)).toBeInTheDocument();
    // The other sections still render.
    expect(await screen.findByText('In Production')).toBeInTheDocument();
  });
});

describe('Reports route guard (v0.6 F3)', () => {
  const renderAppAt = (path) => {
    window.history.pushState({}, '', path);
    return render(<App />);
  };

  const mockMe = (user) =>
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ success: true, user })
      )
    );

  it('keeps an authenticated non-admin out of /admin/reports (redirects home)', async () => {
    localStorage.setItem('hao_token', 'buyer-token');
    mockMe(buyerUser);

    renderAppAt('/admin/reports');

    expect(await screen.findByText('Custom Order Creator')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('redirects an unauthenticated visitor from /admin/reports to /login', async () => {
    renderAppAt('/admin/reports');

    expect(await screen.findByText('Portal Sign In')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('lets an authenticated admin reach /admin/reports', async () => {
    localStorage.setItem('hao_token', 'admin-token');
    mockMe(adminUser);
    server.use(...reportsHandlers());

    renderAppAt('/admin/reports');

    expect(window.location.pathname).toBe('/admin/reports');
    expect(
      await screen.findByText('Combination Spanner Set 14pc')
    ).toBeInTheDocument();
  });
});
