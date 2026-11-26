import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { server } from '../test/server';
import { API_BASE } from '../test/fixtures';

// Never let Firebase initialise in tests (mirrors src/test/setup.js).
vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

// Local fixtures + handlers for the notifications contract. Handlers are
// registered per-test-file with server.use(...) so the shared
// src/test/handlers.js / fixtures.js stay untouched (parallel builders).
const minutesAgo = (mins) => new Date(Date.now() - mins * 60_000).toISOString();

const sampleNotifications = () => [
  {
    _id: 'notif-1',
    type: 'order_status',
    title: 'Order shipped',
    body: 'Order HAO-2026-100001 is on its way.',
    link: '/my-orders',
    read: false,
    createdAt: minutesAgo(5),
  },
  {
    _id: 'notif-2',
    type: 'invoice',
    title: 'Invoice ready',
    body: 'Your invoice for HAO-2026-100001 is ready.',
    link: '/my-orders',
    read: false,
    createdAt: minutesAgo(120),
  },
  {
    // Exercises the `id` (no underscore) identity fallback.
    id: 'notif-3',
    type: 'message',
    title: 'Message from export desk',
    body: 'We confirmed your shipping marks.',
    link: '/my-orders',
    read: true,
    createdAt: minutesAgo(60 * 26),
  },
];

let items;
let readRequests;
let readAllRequests;

const installNotificationHandlers = () => {
  server.use(
    http.get(`${API_BASE}/notifications`, ({ request }) => {
      const url = new URL(request.url);
      const data = url.searchParams.get('unread') === 'true'
        ? items.filter((n) => !n.read)
        : items;
      return HttpResponse.json({
        success: true,
        data,
        total: data.length,
        page: Number(url.searchParams.get('page') || 1),
        limit: Number(url.searchParams.get('limit') || 20),
      });
    }),
    http.get(`${API_BASE}/notifications/unread-count`, () =>
      HttpResponse.json({ success: true, count: items.filter((n) => !n.read).length })
    ),
    http.patch(`${API_BASE}/notifications/:id/read`, ({ params }) => {
      readRequests.push(params.id);
      items = items.map((n) =>
        (n._id ?? n.id) === params.id ? { ...n, read: true } : n
      );
      return HttpResponse.json({ success: true });
    }),
    http.post(`${API_BASE}/notifications/read-all`, () => {
      readAllRequests.push(true);
      items = items.map((n) => ({ ...n, read: true }));
      return HttpResponse.json({ success: true });
    })
  );
};

const renderBell = () => {
  localStorage.setItem('hao_token', 'buyer-token');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <NotificationBell />
          <Routes>
            <Route path="/" element={<div>Home Landing</div>} />
            <Route path="/my-orders" element={<div>My Orders Landing</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const openPanel = async (user) => {
  await user.click(await screen.findByRole('button', { name: /notifications/i }));
};

beforeEach(() => {
  items = sampleNotifications();
  readRequests = [];
  readAllRequests = [];
  installNotificationHandlers();
});

describe('NotificationBell', () => {
  it('shows the unread count as a badge on the bell', async () => {
    renderBell();

    const badge = await screen.findByTestId('unread-badge');
    expect(badge).toHaveTextContent('2');
  });

  it('lists notifications in the panel with unread items styled distinctly', async () => {
    const user = userEvent.setup();
    renderBell();

    await openPanel(user);

    const unreadItem = (await screen.findByText('Order shipped')).closest('button');
    expect(unreadItem).toHaveClass('is-unread');
    expect(screen.getByText('5m ago')).toBeInTheDocument();

    const readItem = screen.getByText('Message from export desk').closest('button');
    expect(readItem).toHaveClass('is-read');
    expect(readItem).not.toHaveClass('is-unread');
  });

  it('marks an item read and navigates to its link when clicked', async () => {
    const user = userEvent.setup();
    renderBell();

    await openPanel(user);
    await user.click(await screen.findByText('Order shipped'));

    expect(await screen.findByText('My Orders Landing')).toBeInTheDocument();
    await waitFor(() => expect(readRequests).toEqual(['notif-1']));
  });

  it('clears the badge when "Mark all read" is used', async () => {
    const user = userEvent.setup();
    renderBell();

    expect(await screen.findByTestId('unread-badge')).toHaveTextContent('2');

    await openPanel(user);
    await user.click(await screen.findByRole('button', { name: /mark all read/i }));

    await waitFor(() => expect(readAllRequests).toHaveLength(1));
    await waitFor(() =>
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument()
    );
  });

  it('renders a clean empty state when there are no notifications', async () => {
    items = [];
    const user = userEvent.setup();
    renderBell();

    // No badge when nothing is unread.
    await screen.findByRole('button', { name: /notifications/i });
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();

    await openPanel(user);

    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('closes the panel on Escape', async () => {
    const user = userEvent.setup();
    renderBell();

    await openPanel(user);
    expect(await screen.findByText('Order shipped')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByText('Order shipped')).not.toBeInTheDocument()
    );
  });
});
