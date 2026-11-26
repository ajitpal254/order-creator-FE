import React, { Suspense, lazy, useCallback, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { assistantApi } from '../../api/assistant';
import { STAFF_ROLES } from '../../hooks/useBuyerDashboard';
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
const PROPOSAL_CONFIRM_ERROR =
  "Sorry, I couldn't create the draft order from that proposal. Please try again.";
const PROPOSAL_DISMISS_ERROR =
  "Sorry, I couldn't dismiss that proposal. Please try again.";
const EXTRACT_INTRO =
  "I've extracted a draft order from your PO — review the lines below, then confirm to create the draft.";
const EXTRACT_ERROR =
  "Sorry, I couldn't extract an order from that file. Please check it is a PDF, XLSX or CSV purchase order and try again.";
const EXTRACT_NO_PROPOSAL =
  "I couldn't find an order to extract from that file. Please try a different purchase order.";

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
    if (res.data.reply || res.data.conversationId || res.data.proposal) return res.data;
  }
  return res || {};
};

// Same envelope tolerance for the proposal endpoints: confirm resolves
// { order } and extract-po resolves { proposal }, possibly wrapped.
const unwrapProposalResponse = (res) => {
  if (res && typeof res === 'object' && res.data && typeof res.data === 'object') {
    if (res.data.proposal || res.data.order) return res.data;
  }
  return res || {};
};

const isValidProposal = (proposal) =>
  Boolean(proposal && typeof proposal === 'object' && (proposal.id || proposal._id));

// Normalise the id field the card/handlers rely on.
const normaliseProposal = (proposal) =>
  proposal && typeof proposal === 'object'
    ? { ...proposal, id: proposal.id ?? proposal._id }
    : proposal;

export const AssistantWidget = () => {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [sending, setSending] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(null);
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

  const appendMessage = useCallback((role, text, extra = {}) => {
    const message = { id: nextId(), role, text, ...extra };
    messagesRef.current = [...messagesRef.current, message];
    setMessages(messagesRef.current);
    return message;
  }, []);

  // Patch one message in place (proposal lifecycle transitions) — the
  // messagesRef mirror keeps the change visible to other handlers.
  const updateMessage = useCallback((messageId, patch) => {
    messagesRef.current = messagesRef.current.map((m) =>
      m.id === messageId ? { ...m, ...patch } : m
    );
    setMessages(messagesRef.current);
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
            : 'Here is what I found.',
          isValidProposal(data.proposal)
            ? {
                proposal: normaliseProposal(data.proposal),
                proposalState: { status: 'pending' },
              }
            : {}
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

  // Proposal actions (v1.0 F2). The card passes the PROPOSAL id; the
  // owning message is found from state so its proposalState can move
  // through confirming -> confirmed / error (and likewise for dismiss).
  const findProposalMessage = useCallback(
    (proposalId) =>
      messagesRef.current.find((m) => m.proposal && m.proposal.id === proposalId),
    []
  );

  const handleConfirmProposal = useCallback(
    async (proposalId) => {
      const message = findProposalMessage(proposalId);
      if (!message || message.proposalState?.status === 'confirming') return;
      updateMessage(message.id, {
        proposalState: { status: 'confirming' },
      });
      try {
        const res = await assistantApi.confirmProposal(proposalId);
        const data = unwrapProposalResponse(res);
        const order =
          data.order && typeof data.order === 'object' ? data.order : null;
        updateMessage(message.id, {
          proposalState: { status: 'confirmed', order },
        });
        // The new draft should appear in My Orders / dashboard lists.
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      } catch {
        updateMessage(message.id, {
          proposalState: { status: 'error', error: PROPOSAL_CONFIRM_ERROR },
        });
      }
    },
    [findProposalMessage, queryClient, updateMessage]
  );

  const handleDismissProposal = useCallback(
    async (proposalId) => {
      const message = findProposalMessage(proposalId);
      if (!message || message.proposalState?.status === 'dismissing') return;
      updateMessage(message.id, {
        proposalState: { status: 'dismissing' },
      });
      try {
        await assistantApi.dismissProposal(proposalId);
        updateMessage(message.id, {
          proposalState: { status: 'dismissed' },
        });
      } catch {
        updateMessage(message.id, {
          proposalState: { status: 'error', error: PROPOSAL_DISMISS_ERROR },
        });
      }
    },
    [findProposalMessage, updateMessage]
  );

  // Staff PO extraction (v1.0 F2): upload the file, then render the
  // returned proposal as an editable review card in the conversation.
  const handleExtractPo = useCallback(
    async (file) => {
      if (!file || extracting) return;
      setExtracting(true);
      setExtractProgress(null);
      try {
        const res = await assistantApi.extractPo(file, {
          onProgress: (percent) => setExtractProgress(percent),
        });
        const data = unwrapProposalResponse(res);
        if (isValidProposal(data.proposal)) {
          appendMessage('assistant', EXTRACT_INTRO, {
            proposal: normaliseProposal(data.proposal),
            proposalState: { status: 'pending' },
            proposalReview: true,
          });
        } else {
          appendMessage('assistant', EXTRACT_NO_PROPOSAL);
        }
      } catch {
        appendMessage('assistant', EXTRACT_ERROR);
      } finally {
        setExtracting(false);
        setExtractProgress(null);
      }
    },
    [appendMessage, extracting]
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

  // PO extraction is staff-only: the app's staff roles (STAFF_ROLES, plus
  // the generic 'staff' role and admins) — same checks DocumentsPanel /
  // PayPanel use.
  const canExtractPo =
    Boolean(isAdmin) || user?.role === 'staff' || STAFF_ROLES.includes(user?.role);

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
            onConfirmProposal={handleConfirmProposal}
            onDismissProposal={handleDismissProposal}
            canExtractPo={canExtractPo}
            onExtractPo={handleExtractPo}
            extracting={extracting}
            extractProgress={extractProgress}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AssistantWidget;
