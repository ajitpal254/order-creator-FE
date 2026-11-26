import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { API_BASE, myOrders, products } from '../test/fixtures';
import { AuthProvider } from '../context/AuthContext';
import { OrderProvider } from '../context/OrderContext';
import { CompaniesSection } from '../pages/settings/CompaniesSection';
import { OrderCreatorPage } from '../pages/order/OrderCreatorPage';
import { CatalogPage } from '../pages/catalog/CatalogPage';
import { BuyerOrderCard } from '../components/buyer/BuyerOrderCard';

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// ---------------------------------------------------------------------------
// Fixtures (local to this suite, following the per-file pattern)
// ---------------------------------------------------------------------------

const companyFixture = () => ({
  _id: 'comp-1',
  name: 'Apex Industrial Supplies',
  spendLimit: 5000,
  creditTerms: 'Net 30',
  members: [
    {
      user: {
        _id: 'user-buyer-1',
        email: 'buyer@apex.example.com',
        customerName: 'Johnathan Smith',
      },
      role: 'owner',
    },
    {
      user: { _id: 'user-clerk-1', email: 'clerk@apex.example.com' },
      role: 'member',
    },
  ],
});

const pendingOrder = {
  _id: 'order-pending-1',
  orderNumber: 'HAO-2026-100301',
  status: 'Submitted',
  company: 'comp-1',
  approvalStatus: 'pending',
  totalAmount: 2500.0,
  createdAt: '2026-11-24T10:30:00.000Z',
  items: [],
};

const approvedOrder = {
  ...pendingOrder,
  _id: 'order-approved-1',
  orderNumber: 'HAO-2026-100302',
  approvalStatus: 'approved',
};

let mine;
let company;
let companyOrders;
let createdCompanyBodies;
let inviteBodies;
let approveCalls;
let rejectCalls;

const installCompanyHandlers = () => {
  server.use(
    http.get(`${API_BASE}/companies/mine`, () =>
      HttpResponse.json({ success: true, data: mine })
    ),
    http.post(`${API_BASE}/companies`, async ({ request }) => {
      const body = await request.json();
      createdCompanyBodies.push(body);
      const created = { _id: 'comp-new', name: body.name, members: [] };
      mine = [...mine, { company: created, role: 'owner' }];
      company = created;
      return HttpResponse.json({ success: true, data: created });
    }),
    http.get(`${API_BASE}/companies/:id`, () =>
      HttpResponse.json({ success: true, data: company })
    ),
    http.get(`${API_BASE}/companies/:id/orders`, () =>
      HttpResponse.json({ success: true, data: companyOrders })
    ),
    http.post(`${API_BASE}/companies/:id/members`, async ({ request }) => {
      const body = await request.json();
      inviteBodies.push(body);
      return HttpResponse.json({ success: true, data: { invited: true } });
    }),
    http.post(`${API_BASE}/orders/:id/approve`, ({ params }) => {
      approveCalls.push(params.id);
      companyOrders = companyOrders.map((o) =>
        o._id === params.id ? { ...o, approvalStatus: 'approved' } : o
      );
      return HttpResponse.json({ success: true });
    }),
    http.post(`${API_BASE}/orders/:id/reject-approval`, async ({ params, request }) => {
      const body = await request.json();
      rejectCalls.push({ id: params.id, body });
      companyOrders = companyOrders.map((o) =>
        o._id === params.id ? { ...o, approvalStatus: 'rejected' } : o
      );
      return HttpResponse.json({ success: true });
    })
  );
};

const renderCompanies = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CompaniesSection />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  mine = [{ company: companyFixture(), role: 'owner' }];
  company = companyFixture();
  companyOrders = [pendingOrder, approvedOrder];
  createdCompanyBodies = [];
  inviteBodies = [];
  approveCalls = [];
  rejectCalls = [];
  installCompanyHandlers();
});

// ---------------------------------------------------------------------------
// Companies section
// ---------------------------------------------------------------------------

describe('CompaniesSection (v0.9 F3)', () => {
  it('lists my companies with my role and shows members + finances for the owner', async () => {
    renderCompanies();

    expect(
      await screen.findByText('Apex Industrial Supplies')
    ).toBeInTheDocument();
    expect(screen.getByText('Your role: owner')).toBeInTheDocument();

    // Members from the company detail, with their roles.
    expect(await screen.findByText('buyer@apex.example.com')).toBeInTheDocument();
    expect(screen.getByText('clerk@apex.example.com')).toBeInTheDocument();

    // Owner-only finance fields are editable and pre-filled from the API.
    await waitFor(() =>
      expect(screen.getByLabelText(/spend limit/i)).toHaveValue(5000)
    );
    expect(screen.getByLabelText(/credit terms/i)).toHaveValue('Net 30');
  });

  it('creates a company with POST {name} and lists it', async () => {
    mine = [];
    const user = userEvent.setup();
    renderCompanies();

    expect(
      await screen.findByText(/don't belong to any company yet/i)
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/company name/i), 'New Trading Co');
    await user.click(screen.getByRole('button', { name: /create company/i }));

    expect(await screen.findByText('Company created.')).toBeInTheDocument();
    expect(createdCompanyBodies).toEqual([{ name: 'New Trading Co' }]);
    expect(await screen.findByText('New Trading Co')).toBeInTheDocument();
  });

  it('invites a member by email + role via POST /companies/:id/members', async () => {
    const user = userEvent.setup();
    renderCompanies();

    await screen.findByText('clerk@apex.example.com');
    await user.type(
      screen.getByLabelText(/invite by email/i),
      'newhire@apex.example.com'
    );
    await user.selectOptions(screen.getByLabelText(/member role/i), 'approver');
    await user.click(screen.getByRole('button', { name: /invite member/i }));

    expect(await screen.findByText('Member invited.')).toBeInTheDocument();
    expect(inviteBodies).toEqual([
      { email: 'newhire@apex.example.com', role: 'approver' },
    ]);
  });

  it('approves a pending company order via POST /orders/:id/approve', async () => {
    const user = userEvent.setup();
    renderCompanies();

    expect(
      await screen.findByText(/awaiting your approval/i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(approveCalls).toEqual(['order-pending-1']));
    expect(
      await screen.findByText(/HAO-2026-100301 approved/i)
    ).toBeInTheDocument();
  });

  it('rejects a pending company order with a reason via POST /orders/:id/reject-approval', async () => {
    const user = userEvent.setup();
    renderCompanies();

    await screen.findByText(/awaiting your approval/i);
    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    await user.type(
      screen.getByLabelText(/rejection reason/i),
      'Over the spend limit'
    );
    await user.click(screen.getByRole('button', { name: /confirm reject/i }));

    await waitFor(() =>
      expect(rejectCalls).toEqual([
        { id: 'order-pending-1', body: { reason: 'Over the spend limit' } },
      ])
    );
  });
});

// ---------------------------------------------------------------------------
// Approval status chip on buyer orders
// ---------------------------------------------------------------------------

describe('Approval status chip (v0.9 F3)', () => {
  it('shows Pending approval on a buyer order card when approvalStatus is pending', () => {
    render(
      <MemoryRouter>
        <BuyerOrderCard order={{ ...myOrders[0], approvalStatus: 'pending' }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
  });

  it('shows nothing extra when approvalStatus is none', () => {
    render(
      <MemoryRouter>
        <BuyerOrderCard order={{ ...myOrders[0], approvalStatus: 'none' }} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Pending approval|Approved|Rejected/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Order creation with a company
// ---------------------------------------------------------------------------

describe('Order creator company selector (v0.9 F3)', () => {
  it('includes companyId in the POST /orders payload when a company is selected', async () => {
    let createdOrderBody = null;
    server.use(
      http.get(`${API_BASE}/addresses`, () =>
        HttpResponse.json({ success: true, data: [] })
      ),
      http.post(`${API_BASE}/orders`, async ({ request }) => {
        createdOrderBody = await request.json();
        return HttpResponse.json({ success: true, order: myOrders[0] });
      })
    );
    localStorage.setItem('hao_token', 'access-token-1');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/order-creator']}>
        <AuthProvider>
          <OrderProvider>
            <OrderCreatorPage />
          </OrderProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // The selector appears only because the buyer belongs to a company.
    const selector = await screen.findByLabelText(/order for a company/i);
    await user.selectOptions(selector, 'comp-1');

    expect(
      await screen.findByText(`Selected SKU: ${products[0].sku}`)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add line item/i }));
    await user.click(
      screen.getByRole('button', { name: /submit order to h\.a\. overseas/i })
    );

    await waitFor(() => expect(createdOrderBody).not.toBeNull());
    expect(createdOrderBody.companyId).toBe('comp-1');
    expect(createdOrderBody.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Public RFQ form on the catalog page
// ---------------------------------------------------------------------------

describe('Public RFQ form (v0.9 F3)', () => {
  it('submits to /api/public/rfq without an Authorization header and shows success', async () => {
    let rfqBody = null;
    let rfqAuth = 'not-captured';
    server.use(
      http.get(`${API_BASE}/companies/mine`, () =>
        HttpResponse.json({ success: true, data: [] })
      ),
      http.post(`${API_BASE}/public/rfq`, async ({ request }) => {
        rfqAuth = request.headers.get('authorization');
        rfqBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/catalog']}>
          <OrderProvider>
            <CatalogPage />
          </OrderProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText(products[0].name)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your name/i), 'Priya Buyer');
    await user.type(screen.getByLabelText(/^email/i), 'priya@example.com');
    await user.type(screen.getByLabelText(/^company/i), 'Priya Trading');
    await user.type(
      screen.getByLabelText(/message/i),
      'Please quote 500 grease guns shipped to Dubai.'
    );
    await user.type(
      screen.getByLabelText(/item 1 product name/i),
      'Lever Grease Gun 400cc'
    );
    await user.type(screen.getByLabelText(/item 1 quantity/i), '500');

    await user.click(
      screen.getByRole('button', { name: /send quote request/i })
    );

    expect(
      await screen.findByText(/your quote request has been sent/i)
    ).toBeInTheDocument();
    expect(rfqAuth).toBeNull();
    expect(rfqBody).toMatchObject({
      name: 'Priya Buyer',
      email: 'priya@example.com',
      company: 'Priya Trading',
      message: 'Please quote 500 grease guns shipped to Dubai.',
      website: '',
    });
    expect(rfqBody.items).toEqual([
      { productName: 'Lever Grease Gun 400cc', quantity: 500 },
    ]);
  });
});
