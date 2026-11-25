import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { TrackPage } from '../pages/track/TrackPage';
import { ShareTrackingButton } from '../components/tracking/ShareTrackingButton';
import { server } from '../test/server';
import { API_BASE } from '../test/fixtures';

// Public tracking payload: only the fields the public endpoint returns.
const publicTracking = {
  orderNumber: 'HAO-2026-100001',
  status: 'Dispatched',
  carrier: 'DHL Express',
  trackingNumber: '1234567890',
  timeline: [
    {
      status: 'Dispatched',
      note: 'Handed to carrier',
      updatedAt: '2026-11-24T08:00:00.000Z',
    },
    {
      status: 'In Transit',
      note: 'Departed origin hub',
      updatedAt: '2026-11-25T08:00:00.000Z',
    },
  ],
};

const renderTrackPage = (token) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/track/${token}`]}>
        <Routes>
          <Route path="/track/:token" element={<TrackPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('TrackPage — public tracking', () => {
  it('renders order number, status, timeline and carrier details without sending auth', async () => {
    let seenAuthorization = 'unset';
    server.use(
      http.get(`${API_BASE}/track/:token`, ({ request }) => {
        seenAuthorization = request.headers.get('authorization');
        return HttpResponse.json(publicTracking);
      })
    );
    // Even with a session token lying around, the public lookup must
    // not send it.
    localStorage.setItem('hao_token', 'test-token');

    renderTrackPage('tok-abc');

    expect(await screen.findByText('HAO-2026-100001')).toBeInTheDocument();
    expect(screen.getByText('Dispatched', { selector: '.badge' })).toBeInTheDocument();
    expect(screen.getByText(/Handed to carrier/)).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(screen.getByText(/Departed origin hub/)).toBeInTheDocument();
    expect(screen.getByText('DHL Express')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(seenAuthorization).toBeNull();
  });

  it('shows the friendly error state for an invalid or expired token', async () => {
    server.use(
      http.get(`${API_BASE}/track/:token`, () =>
        HttpResponse.json({ message: 'Tracking link not found' }, { status: 404 })
      )
    );

    renderTrackPage('tok-expired');

    expect(
      await screen.findByText('This tracking link is invalid or has expired.')
    ).toBeInTheDocument();
    expect(screen.queryByText('HAO-2026-100001')).not.toBeInTheDocument();
  });
});

describe('ShareTrackingButton', () => {
  const shippedOrder = {
    _id: 'order-9',
    orderNumber: 'HAO-2026-100009',
    status: 'Dispatched',
  };

  it('copies the tracking URL to the clipboard and confirms', async () => {
    server.use(
      http.get(`${API_BASE}/orders/:id/tracking-link`, () =>
        HttpResponse.json({
          success: true,
          url: 'http://localhost:5000/track/tok-xyz',
          token: 'tok-xyz',
          expiresAt: '2026-12-25T00:00:00.000Z',
        })
      )
    );
    // userEvent.setup() installs its own clipboard stub, so the mock
    // must be defined AFTER setup or it gets replaced.
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<ShareTrackingButton order={shippedOrder} />);

    await user.click(screen.getByRole('button', { name: /share tracking link/i }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('http://localhost:5000/track/tok-xyz')
    );
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('renders nothing for an order that has not shipped', () => {
    const { container } = render(
      <ShareTrackingButton order={{ ...shippedOrder, status: 'In Production' }} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
