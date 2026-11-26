import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { DeveloperSection } from '../pages/settings/DeveloperSection';
import { queryClient } from '../lib/queryClient';
import { server } from '../test/server';
import {
  API_BASE,
  createdApiKey,
  createdWebhook,
  developerApiKeys,
  developerWebhooks,
  webhookDeliveries,
} from '../test/fixtures';

// v1.0 F1 — Developer settings: API keys + webhooks.
// Handlers are stateful per test so creates/revokes/deletes are visible
// in the lists exactly as the real per-user API would behave.

let keys;
let webhooks;
let deletedKeyIds;
let deletedWebhookIds;
let createKeyBodies;
let createWebhookBodies;

const useDeveloperHandlers = () =>
  server.use(
    http.get(`${API_BASE}/developer/keys`, () =>
      HttpResponse.json({ success: true, data: keys })
    ),
    http.post(`${API_BASE}/developer/keys`, async ({ request }) => {
      const body = await request.json();
      createKeyBodies.push(body);
      keys = [
        ...keys,
        {
          id: createdApiKey.id,
          name: body.name,
          prefix: createdApiKey.prefix,
          scopes: body.scopes,
          lastUsedAt: null,
          createdAt: '2026-11-25T10:00:00.000Z',
        },
      ];
      return HttpResponse.json({ success: true, data: createdApiKey });
    }),
    http.delete(`${API_BASE}/developer/keys/:id`, ({ params }) => {
      deletedKeyIds.push(params.id);
      keys = keys.filter((k) => k.id !== params.id);
      return HttpResponse.json({ success: true });
    }),
    http.get(`${API_BASE}/developer/webhooks`, () =>
      HttpResponse.json({ success: true, data: webhooks })
    ),
    http.post(`${API_BASE}/developer/webhooks`, async ({ request }) => {
      const body = await request.json();
      createWebhookBodies.push(body);
      webhooks = [
        ...webhooks,
        {
          id: createdWebhook.id,
          url: body.url,
          events: body.events,
          active: true,
          createdAt: '2026-11-25T10:00:00.000Z',
        },
      ];
      return HttpResponse.json({ success: true, data: createdWebhook });
    }),
    http.delete(`${API_BASE}/developer/webhooks/:id`, ({ params }) => {
      deletedWebhookIds.push(params.id);
      webhooks = webhooks.filter((w) => w.id !== params.id);
      return HttpResponse.json({ success: true });
    }),
    http.get(`${API_BASE}/developer/webhooks/:id/deliveries`, () =>
      HttpResponse.json({ success: true, data: webhookDeliveries })
    )
  );

const renderSection = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <DeveloperSection />
    </QueryClientProvider>
  );

beforeEach(() => {
  queryClient.clear();
  keys = [...developerApiKeys];
  webhooks = [...developerWebhooks];
  deletedKeyIds = [];
  deletedWebhookIds = [];
  createKeyBodies = [];
  createWebhookBodies = [];
  useDeveloperHandlers();
});

describe('Developer settings (v1.0 F1)', () => {
  it('renders the docs blurb: auth header, signature header, example payload', async () => {
    renderSection();

    expect(await screen.findByText('Warehouse integration')).toBeInTheDocument();
    expect(screen.getAllByText(/X-API-Key/).length).toBeGreaterThan(0);
    expect(screen.getByText(/X-HAO-Signature/)).toBeInTheDocument();
    expect(screen.getByText(/HAO-2026-100042/)).toBeInTheDocument();
  });

  it('lists keys with prefix, scopes, and Never for a null lastUsedAt', async () => {
    renderSection();

    expect(await screen.findByText('Warehouse integration')).toBeInTheDocument();
    expect(screen.getByText('Unused spare key')).toBeInTheDocument();
    expect(screen.getByText('hao_live_8f3a')).toBeInTheDocument();
    // 'products:read' appears both as a scope checkbox label and as a
    // badge on the key row.
    expect(screen.getAllByText('products:read').length).toBeGreaterThan(0);
    expect(screen.getByText(/Last used Never/)).toBeInTheDocument();
  });

  it('create-key shows the plaintext once and it disappears after dismiss', async () => {
    const user = userEvent.setup();
    // Stub the clipboard AFTER userEvent.setup() — setup installs its own
    // clipboard stub, which would otherwise replace this one.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderSection();

    await screen.findByText('Warehouse integration');
    await user.type(screen.getByLabelText(/key name/i), 'CI deploy key');
    await user.click(screen.getByLabelText('orders:read'));
    await user.click(screen.getByRole('button', { name: /create api key/i }));

    // The plaintext key is shown once, prominently, with the warning.
    expect(
      await screen.findByText(createdApiKey.key)
    ).toBeInTheDocument();
    expect(screen.getByText(/you won't see this again/i)).toBeInTheDocument();
    expect(createKeyBodies).toEqual([
      { name: 'CI deploy key', scopes: ['orders:read'] },
    ]);

    // Copy button copies the plaintext.
    await user.click(screen.getByRole('button', { name: /^copy$/i }));
    expect(writeText).toHaveBeenCalledWith(createdApiKey.key);

    // Dismiss clears it from the page (and from state).
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText(createdApiKey.key)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/you won't see this again/i)
    ).not.toBeInTheDocument();
  });

  it('revoke flow confirms in a modal and calls DELETE for the key', async () => {
    const user = userEvent.setup();
    renderSection();

    const row = (await screen.findByText('Warehouse integration')).closest('div');
    await user.click(within(row.parentElement).getByRole('button', { name: /revoke/i }));

    // Confirmation step appears; nothing deleted yet.
    expect(
      await screen.findByRole('heading', { name: /revoke api key/i })
    ).toBeInTheDocument();
    expect(deletedKeyIds).toEqual([]);

    await user.click(screen.getByRole('button', { name: /revoke key/i }));

    expect(
      await screen.findByText('API key revoked.')
    ).toBeInTheDocument();
    expect(deletedKeyIds).toEqual(['key-1']);
    expect(screen.queryByText('Warehouse integration')).not.toBeInTheDocument();
  });

  it('webhook create shows the signing secret once, then it disappears on dismiss', async () => {
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('https://example.com/hooks/ha-overseas');
    await user.type(
      screen.getByLabelText(/webhook url/i),
      'https://example.com/hooks/new'
    );
    await user.click(screen.getByLabelText('order.created'));
    await user.click(screen.getByRole('button', { name: /add webhook/i }));

    expect(
      await screen.findByText(createdWebhook.secret)
    ).toBeInTheDocument();
    expect(screen.getByText(/you won't see this again/i)).toBeInTheDocument();
    expect(createWebhookBodies).toEqual([
      { url: 'https://example.com/hooks/new', events: ['order.created'] },
    ]);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText(createdWebhook.secret)).not.toBeInTheDocument();
  });

  it('lists subscriptions with active state and deletes one', async () => {
    const user = userEvent.setup();
    renderSection();

    expect(
      await screen.findByText('https://example.com/hooks/ha-overseas')
    ).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    // 'payment.confirmed' appears both as an event checkbox label and as
    // a badge on the subscription row.
    expect(screen.getAllByText('payment.confirmed').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(
      await screen.findByText('Webhook subscription deleted.')
    ).toBeInTheDocument();
    expect(deletedWebhookIds).toEqual(['wh-1']);
    expect(
      screen.queryByText('https://example.com/hooks/ha-overseas')
    ).not.toBeInTheDocument();
  });

  it('delivery log viewer renders event, status, attempts and HTTP code', async () => {
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('https://example.com/hooks/ha-overseas');
    await user.click(screen.getByRole('button', { name: /deliveries/i }));

    expect(await screen.findByText(/Status: delivered/)).toBeInTheDocument();
    expect(screen.getByText(/Status: failed/)).toBeInTheDocument();
    expect(screen.getByText(/Attempts: 3/)).toBeInTheDocument();
    expect(screen.getByText(/HTTP 200/)).toBeInTheDocument();
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
  });
});
