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
import { API_BASE, assistantFaq } from '../test/fixtures';

// Never let Firebase initialise in tests (mirrors src/test/setup.js).
vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

let messageBodies;
let feedbackBodies;
let handoffBodies;
let deletedIds;
let faqRequests;

const installAssistantHandlers = () => {
  server.use(
    http.post(`${API_BASE}/assistant/message`, async ({ request }) => {
      const body = await request.json().catch(() => ({}));
      messageBodies.push(body);
      return HttpResponse.json({
        conversationId: 'conv-1',
        reply: `Reply to: ${body.message}`,
        chips: ['Track my order', 'Talk to a person'],
      });
    }),
    http.post(`${API_BASE}/assistant/feedback`, async ({ request }) => {
      feedbackBodies.push(await request.json().catch(() => ({})));
      return HttpResponse.json({ ok: true });
    }),
    http.post(`${API_BASE}/assistant/handoff`, async ({ request }) => {
      handoffBodies.push(await request.json().catch(() => ({})));
      return HttpResponse.json({ ok: true });
    }),
    http.get(`${API_BASE}/assistant/faq`, () => {
      faqRequests.push(true);
      return HttpResponse.json(assistantFaq);
    }),
    http.delete(`${API_BASE}/assistant/conversations/:id`, ({ params }) => {
      deletedIds.push(params.id);
      return HttpResponse.json({ ok: true });
    })
  );
};

const renderWidget = () => {
  localStorage.setItem('hao_token', 'buyer-token');
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

// Assistant replies appear twice in the DOM by design: once in the
// message bubble and once in the drawer's aria-live announcement region.
// findAllByText is therefore the correct query for reply text.
const findReply = async (text) => (await screen.findAllByText(text))[0];

const sendMessage = async (user, text) => {
  const input = await screen.findByLabelText(/message the assistant/i);
  await user.type(input, text);
  await user.click(screen.getByRole('button', { name: /send message/i }));
};

beforeEach(() => {
  messageBodies = [];
  feedbackBodies = [];
  handoffBodies = [];
  deletedIds = [];
  faqRequests = [];
  installAssistantHandlers();
});

describe('AssistantWidget', () => {
  it('is closed initially, opens from the FAB, and sends the conversationId on the second message', async () => {
    const user = userEvent.setup();
    renderWidget();

    // Drawer closed initially — only the FAB is present.
    expect(await screen.findByRole('button', { name: /open assistant chat/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /assistant chat/i })).not.toBeInTheDocument();

    await openDrawer(user);
    expect(screen.getByText(/AI assistant — a guided helper/i)).toBeInTheDocument();

    await sendMessage(user, 'Where is my order?');
    await findReply('Reply to: Where is my order?');
    expect(messageBodies[0]).toEqual({ message: 'Where is my order?' });

    await sendMessage(user, 'And the price?');
    await findReply('Reply to: And the price?');
    await waitFor(() => expect(messageBodies).toHaveLength(2));
    expect(messageBodies[1]).toEqual({
      message: 'And the price?',
      conversationId: 'conv-1',
    });
  });

  it('sends a chip text as a user message when a chip is clicked', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await user.click(screen.getByRole('button', { name: 'Track my order' }));

    await findReply('Reply to: Track my order');
    await waitFor(() =>
      expect(messageBodies).toEqual([{ message: 'Track my order' }])
    );
  });

  it('posts thumbs up/down feedback with the conversationId and marks the choice', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await sendMessage(user, 'Hello');
    await findReply('Reply to: Hello');

    const upButton = screen.getByRole('button', { name: /thumbs up/i });
    await user.click(upButton);
    await waitFor(() =>
      expect(feedbackBodies).toEqual([{ conversationId: 'conv-1', rating: 'up' }])
    );
    expect(upButton).toHaveAttribute('aria-pressed', 'true');

    const downButton = screen.getByRole('button', { name: /thumbs down/i });
    await user.click(downButton);
    await waitFor(() =>
      expect(feedbackBodies).toEqual([
        { conversationId: 'conv-1', rating: 'up' },
        { conversationId: 'conv-1', rating: 'down' },
      ])
    );
    expect(downButton).toHaveAttribute('aria-pressed', 'true');
    expect(upButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('"Talk to a person" posts a handoff with the transcript and shows a confirmation', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await sendMessage(user, 'I need help with my order');
    await findReply('Reply to: I need help with my order');

    // The reply replaced the chips with the response chips, which include
    // the handoff chip.
    await user.click(screen.getByRole('button', { name: 'Talk to a person' }));

    await findReply(/passed this conversation to our team/i);
    await waitFor(() => expect(handoffBodies).toHaveLength(1));
    expect(handoffBodies[0].conversationId).toBe('conv-1');
    expect(handoffBodies[0].transcript).toContain('User: I need help with my order');
    expect(handoffBodies[0].transcript).toContain(
      'Assistant: Reply to: I need help with my order'
    );
  });

  it('renders FAQs as an assistant message when the FAQs chip is clicked', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await user.click(screen.getByRole('button', { name: 'FAQs' }));

    await findReply(/What is the minimum order quantity\?/i);
    await waitFor(() => expect(faqRequests).toHaveLength(1));
    // FAQs are fetched, not sent as a chat message.
    expect(messageBodies).toEqual([]);
  });

  it('clear-chat deletes the conversation server-side and resets the UI', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await sendMessage(user, 'Clear me');
    await findReply('Reply to: Clear me');

    await user.click(screen.getByRole('button', { name: /clear chat/i }));

    await waitFor(() => expect(deletedIds).toEqual(['conv-1']));
    await waitFor(() =>
      expect(screen.queryByText('Reply to: Clear me')).not.toBeInTheDocument()
    );
    // Initial chips are restored after a clear.
    expect(screen.getByRole('button', { name: 'Find a product' })).toBeInTheDocument();
  });

  it('keeps conversation state across drawer close and reopen', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await sendMessage(user, 'Still here?');
    await findReply('Reply to: Still here?');

    await user.click(screen.getByRole('button', { name: /close assistant chat/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /assistant chat/i })).not.toBeInTheDocument()
    );

    await openDrawer(user);
    expect(screen.getAllByText('Reply to: Still here?').length).toBeGreaterThan(0);
    expect(screen.getByText('Still here?')).toBeInTheDocument();
  });

  it('shows a friendly assistant error message when sending fails', async () => {
    server.use(
      http.post(`${API_BASE}/assistant/message`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 })
      )
    );
    const user = userEvent.setup();
    renderWidget();
    await openDrawer(user);

    await sendMessage(user, 'Will fail');

    await findReply(/couldn't reach the assistant/i);
  });
});
