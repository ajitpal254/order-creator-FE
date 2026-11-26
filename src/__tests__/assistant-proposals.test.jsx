import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { AssistantWidget } from '../components/assistant/AssistantWidget';
import { server } from '../test/server';
import {
  API_BASE,
  adminUser,
  assistantCreatedOrder,
  assistantExpiredProposal,
  assistantExtractedProposal,
  assistantProposal,
  buyerUser,
} from '../test/fixtures';

// Assistant proposals + PO extraction (v1.0 FEAT-16 Stages 3–4 — F2).
// Mirrors assistant.test.jsx patterns: per-test MSW handlers capture the
// request evidence, and the widget is rendered inside AuthProvider with a
// seeded token; /auth/me decides the signed-in user's role.

vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

let confirmIds;
let dismissIds;
let extractBodies;
let extractContentTypes;

const installProposalHandlers = ({ proposal = assistantProposal } = {}) => {
  server.use(
    http.post(`${API_BASE}/assistant/message`, async ({ request }) => {
      const body = await request.json().catch(() => ({}));
      return HttpResponse.json({
        conversationId: 'conv-1',
        reply: `Reply to: ${body.message}`,
        chips: ['Track my order'],
        proposal,
      });
    }),
    http.post(`${API_BASE}/assistant/proposals/:id/confirm`, ({ params }) => {
      confirmIds.push(params.id);
      return HttpResponse.json({ order: assistantCreatedOrder });
    }),
    http.post(`${API_BASE}/assistant/proposals/:id/dismiss`, ({ params }) => {
      dismissIds.push(params.id);
      return HttpResponse.json({ ok: true });
    }),
    // The XHR upload carries an Authorization header, so the jsdom/MSW
    // XHR interceptor simulates the CORS preflight the real backend's
    // CORS middleware answers in production.
    http.options(
      `${API_BASE}/assistant/extract-po`,
      ({ request }) =>
        new HttpResponse(null, {
          status: 204,
          headers: {
            // Credentialed preflight: reflect the origin/headers back,
            // as the backend's CORS middleware does in production.
            'Access-Control-Allow-Origin':
              request.headers.get('origin') || '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers':
              request.headers.get('access-control-request-headers') ||
              'Authorization, Content-Type',
          },
        })
    ),
    http.post(`${API_BASE}/assistant/extract-po`, async ({ request }) => {
      // NOTE: request.formData() cannot parse jsdom-serialised File parts
      // (undici webidl File assertion) — assert on the raw multipart body
      // instead; the field name and filename are literal text within it.
      extractContentTypes.push(request.headers.get('content-type'));
      extractBodies.push(await request.text());
      return HttpResponse.json(
        { proposal: assistantExtractedProposal },
        {
          headers: {
            // jsdom enforces CORS on the XHR response too; the backend's
            // CORS middleware adds this in production.
            'Access-Control-Allow-Origin':
              request.headers.get('origin') || '*',
            'Access-Control-Allow-Credentials': 'true',
          },
        }
      );
    })
  );
};

const renderWidget = (user = buyerUser) => {
  server.use(
    http.get(`${API_BASE}/auth/me`, () =>
      HttpResponse.json({ success: true, user })
    )
  );
  localStorage.setItem('hao_token', 'test-token');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AssistantWidget />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const openDrawer = async (user) => {
  await user.click(await screen.findByRole('button', { name: /open assistant chat/i }));
  return screen.findByRole('dialog', { name: /assistant chat/i });
};

const sendMessage = async (user, text) => {
  const input = await screen.findByLabelText(/message the assistant/i);
  await user.type(input, text);
  await user.click(screen.getByRole('button', { name: /send message/i }));
};

beforeEach(() => {
  confirmIds = [];
  dismissIds = [];
  extractBodies = [];
  extractContentTypes = [];
  installProposalHandlers();
});

describe('Assistant proposals (F2)', () => {
  it('renders a proposal card from a message response and Confirm creates the draft with an order link', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await sendMessage(user, 'Draft an order for spanners');

    // Card: kind, summary, line items (payload values verbatim), expiry.
    expect(await screen.findByText('Order draft')).toBeInTheDocument();
    expect(screen.getByText(assistantProposal.summary)).toBeInTheDocument();
    expect(screen.getByText('Combination Spanner Set 14pc')).toBeInTheDocument();
    expect(screen.getByText('Mystery Widget')).toBeInTheDocument();
    expect(screen.getByText(/Qty 200/)).toBeInTheDocument();
    expect(screen.getByText(/\$12\.50 each/)).toBeInTheDocument();
    expect(screen.getByText('Matched')).toBeInTheDocument();
    expect(screen.getByText('Unmatched')).toBeInTheDocument();
    expect(screen.getByText(/Expires/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(confirmIds).toEqual(['prop-1']));
    expect(await screen.findByText(/Draft order created/)).toBeInTheDocument();
    const link = screen.getByRole('link', {
      name: /View draft order HAO-2026-100099/,
    });
    expect(link).toHaveAttribute('href', '/my-orders');
    // The actions are replaced by the success state.
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  });

  it('Dismiss posts to the dismiss endpoint and marks the card dismissed', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await sendMessage(user, 'Draft an order please');
    expect(await screen.findByText(assistantProposal.summary)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => expect(dismissIds).toEqual(['prop-1']));
    expect(await screen.findByText(/Proposal dismissed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
    expect(confirmIds).toEqual([]);
  });

  it('renders an expired proposal as stale with disabled actions', async () => {
    installProposalHandlers({ proposal: assistantExpiredProposal });
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await sendMessage(user, 'Draft an order please');

    expect(
      await screen.findByText(/This proposal has expired/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Expired on/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDisabled();
    expect(confirmIds).toEqual([]);
    expect(dismissIds).toEqual([]);
  });

  it('hides the PO extraction control from buyers', async () => {
    const user = userEvent.setup();
    renderWidget(buyerUser);
    await openDrawer(user);

    expect(
      screen.queryByRole('button', { name: /Extract from PO/i })
    ).not.toBeInTheDocument();
  });
});

describe('Assistant PO extraction (F2)', () => {
  it('uploads a PO as multipart field "file" and renders an editable review list with matched/unmatched lines', async () => {
    const user = userEvent.setup();
    renderWidget(adminUser);
    await openDrawer(user);

    expect(
      screen.getByRole('button', { name: /Extract from PO/i })
    ).toBeInTheDocument();

    const file = new File(['po-contents'], 'purchase-order.pdf', {
      type: 'application/pdf',
    });
    await user.upload(screen.getByLabelText(/PO file/i), file);

    // The upload went out as multipart with the contract field name and
    // the picked file's name inside the raw multipart body.
    await waitFor(() => expect(extractBodies).toHaveLength(1));
    expect(extractContentTypes[0]).toMatch(/multipart\/form-data/);
    expect(extractBodies[0]).toContain('name="file"');
    expect(extractBodies[0]).toContain('purchase-order.pdf');

    // Review list: intro + matched line + clearly flagged unmatched line.
    // (Assistant text renders twice by design — bubble + aria-live region.)
    expect(
      (await screen.findAllByText(/extracted a draft order from your PO/i)).length
    ).toBeGreaterThan(0);
    expect(screen.getByText('Lever Grease Gun 400cc')).toBeInTheDocument();
    expect(screen.getByText('Unrecognised Sprocket XL')).toBeInTheDocument();
    expect(screen.getByText('Matched')).toBeInTheDocument();
    expect(screen.getByText('Unmatched')).toBeInTheDocument();
    expect(screen.getByText(/Review only: quantity edits/i)).toBeInTheDocument();

    // Quantities are editable locally.
    const qtyInput = screen.getByLabelText(
      /Quantity for Lever Grease Gun 400cc/i
    );
    await user.clear(qtyInput);
    await user.type(qtyInput, '75');
    expect(qtyInput).toHaveValue(75);

    // The unmatched line is removable; the matched line is not.
    expect(
      screen.queryByRole('button', { name: /Remove line Lever Grease Gun/i })
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Remove line Unrecognised Sprocket XL/i })
    );
    await waitFor(() =>
      expect(screen.queryByText('Unrecognised Sprocket XL')).not.toBeInTheDocument()
    );

    // Confirm uses the plain proposals confirm endpoint for this proposal.
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(confirmIds).toEqual(['prop-po-1']));
    expect(await screen.findByText(/Draft order created/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /View draft order HAO-2026-100099/ })
    ).toHaveAttribute('href', '/my-orders');
  });
});
