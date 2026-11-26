import React, { Suspense, lazy, useCallback, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { assistantApi } from '../../api/assistant';
import './assistant.css';

// Assistant widget (v0.7 FEAT-16 Stages 1–2 — F1).
// Floating action button + lazy-loaded chat drawer, visible only to
// authenticated users (the assistant tools run as the logged-in user).
// Conversation state lives here — NOT in the drawer — so messages,
// chips, feedback and the conversationId persist across open/close
// within the session. The drawer chunk costs nothing until first open.

const AssistantDrawer = lazy(() => import('./AssistantDrawer'));

export const INITIAL_CHIPS = [
  'Track my order',
  'Find a product',
  'Estimate a price',
  'FAQs',
  'Talk to a person',
];

const FAQ_CHIP = 'FAQs';
const HANDOFF_CHIP = 'Talk to a person';

const ERROR_TEXT =
  "Sorry, I couldn't reach the assistant just now. Please try again in a moment.";
const HANDOFF_CONFIRMATION =
  "I've passed this conversation to our team. Someone will follow up with you — feel free to keep asking me questions in the meantime.";
const HANDOFF_ERROR =
  "Sorry, I couldn't pass this conversation to our team just now. Please try again in a moment.";
const FAQ_ERROR =
  "Sorry, I couldn't load the FAQs just now. Please try again in a moment.";

// The FAQ endpoint's shape is flexible — render whatever it returns
// defensively: a string, an array of {q,a}/{question,answer}/strings,
// or an object wrapping one of those.
export const formatFaq = (payload) => {
  const data =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload.data ?? payload.faqs ?? payload.items ?? payload
      : payload;

  if (typeof data === 'string') return data.trim() || null;

  if (Array.isArray(data)) {
    const lines = data
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const q = item.q ?? item.question;
          const a = item.a ?? item.answer;
          if (q && a) return `Q: ${q}\nA: ${a}`;
          if (a) return String(a);
          if (q) return String(q);
        }
        return null;
      })
      .filter(Boolean);
    return lines.length ? lines.join('\n\n') : null;
  }

  if (data && typeof data === 'object') {
    const q = data.q ?? data.question;
    const a = data.a ?? data.answer;
    if (q && a) return `Q: ${q}\nA: ${a}`;
    if (typeof data.text === 'string') return data.text;
    if (typeof data.content === 'string') return data.content;
    if (typeof data.message === 'string') return data.message;
  }

  return null;
};

// Unwrap a possible { success, data: {...} } envelope; the documented
// contract is the bare { conversationId, reply, chips } shape.
const unwrapMessageResponse = (res) => {
  if (res && typeof res === 'object' && res.data && typeof res.data === 'object') {
    if (res.data.reply || res.data.conversationId) return res.data;
  }
  return res || {};
};

export const AssistantWidget = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({});
  const fabRef = useRef(null);
  const wasOpenRef = useRef(false);
  const conversationIdRef = useRef(null);
  const messagesRef = useRef([]);
  const idCounterRef = useRef(0);

  const nextId = () => {
    idCounterRef.current += 1;
    return `msg-${idCounterRef.current}`;
  };

  const appendMessage = useCallback((role, text) => {
    const message = { id: nextId(), role, text };
    messagesRef.current = [...messagesRef.current, message];
    setMessages(messagesRef.current);
    return message;
  }, []);

  const applyConversationId = useCallback((id) => {
    if (id) {
      conversationIdRef.current = id;
    }
  }, []);

  const sendUserMessage = useCallback(
    async (text) => {
      const trimmed = String(text || '').trim();
      if (!trimmed || sending) return;
      appendMessage('user', trimmed);
      setSending(true);
      try {
        const res = await assistantApi.sendMessage({
          message: trimmed,
          conversationId: conversationIdRef.current || undefined,
        });
        const data = unwrapMessageResponse(res);
        applyConversationId(data.conversationId);
        appendMessage(
          'assistant',
          typeof data.reply === 'string' && data.reply
            ? data.reply
            : 'Here is what I found.'
        );
        if (Array.isArray(data.chips)) {
          setChips(data.chips.filter((chip) => typeof chip === 'string' && chip));
        }
      } catch {
        appendMessage('assistant', ERROR_TEXT);
      } finally {
        setSending(false);
      }
    },
    [appendMessage, applyConversationId, sending]
  );

  const handleFaq = useCallback(async () => {
    if (sending) return;
    setSending(true);
    try {
      const res = await assistantApi.getFaq();
      appendMessage('assistant', formatFaq(res) || FAQ_ERROR);
    } catch {
      appendMessage('assistant', FAQ_ERROR);
    } finally {
      setSending(false);
    }
  }, [appendMessage, sending]);

  const handleHandoff = useCallback(async () => {
    if (sending) return;
    const transcript = messagesRef.current.length
      ? messagesRef.current
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
          .join('\n')
      : 'No messages yet — the user asked to talk to a person.';
    setSending(true);
    try {
      await assistantApi.sendHandoff({
        conversationId: conversationIdRef.current || undefined,
        transcript,
      });
      appendMessage('assistant', HANDOFF_CONFIRMATION);
    } catch {
      appendMessage('assistant', HANDOFF_ERROR);
    } finally {
      setSending(false);
    }
  }, [appendMessage, sending]);

  const handleChip = useCallback(
    (chip) => {
      if (chip === FAQ_CHIP) {
        handleFaq();
      } else if (chip === HANDOFF_CHIP) {
        handleHandoff();
      } else {
        sendUserMessage(chip);
      }
    },
    [handleFaq, handleHandoff, sendUserMessage]
  );

  const handleFeedback = useCallback(
    async (messageId, rating) => {
      try {
        await assistantApi.sendFeedback({
          conversationId: conversationIdRef.current || undefined,
          rating,
        });
        setFeedback((prev) => ({ ...prev, [messageId]: rating }));
      } catch {
        // Feedback is best-effort: a failed rating never disrupts the chat.
      }
    },
    []
  );

  const handleClear = useCallback(async () => {
    const id = conversationIdRef.current;
    if (id) {
      try {
        await assistantApi.deleteConversation(id);
      } catch {
        // Still reset locally — a stale server copy must not trap the user.
      }
    }
    conversationIdRef.current = null;
    messagesRef.current = [];
    setMessages([]);
    setChips(INITIAL_CHIPS);
    setFeedback({});
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  // Return focus to the FAB when the drawer closes.
  React.useEffect(() => {
    if (wasOpenRef.current && !open) {
      fabRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open ]);

  if (!isAuthenticated) return null;

  return (
    <div className="assistant-widget">
      <button
        ref={fabRef}
        type="button"
        className="assistant-fab"
        aria-label="Open assistant chat"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setHasOpened(true);
          setOpen((value) => !value);
        }}
      >
        <MessageCircle size={22} />
      </button>

      {hasOpened && (
        <Suspense fallback={null}>
          <AssistantDrawer
            open={open}
            onClose={handleClose}
            messages={messages}
            chips={chips}
            onChip={handleChip}
            onSend={sendUserMessage}
            sending={sending}
            feedback={feedback}
            onFeedback={handleFeedback}
            onClear={handleClear}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AssistantWidget;
