import React, { useEffect, useRef, useState } from 'react';
import { FileUp, Send, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { ProposalCard } from './ProposalCard';
import './assistant.css';

// Assistant chat drawer (v0.7 FEAT-16 Stages 1–2 — F1).
// Presentational: all conversation state (messages, conversationId, chips,
// feedback) lives in AssistantWidget so it survives open/close. This
// component owns only the draft input, focus trap, Esc-to-close and
// scroll-to-bottom behaviour.

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export const AssistantDrawer = ({
  open,
  onClose,
  messages,
  chips,
  onChip,
  onSend,
  sending,
  feedback,
  onFeedback,
  onClear,
  onConfirmProposal,
  onDismissProposal,
  canExtractPo = false,
  onExtractPo,
  extracting = false,
  extractProgress = null,
}) => {
  const [draft, setDraft] = useState('');
  const drawerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);

  const handlePoFile = (event) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again re-triggers the change event.
    event.target.value = '';
    if (file) onExtractPo?.(file);
  };

  // Focus the input on open, trap Tab inside the drawer, Esc closes.
  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = messagesRef.current;
    if (open && el) el.scrollTop = el.scrollHeight;
  }, [open, messages, sending, extracting]);

  if (!open) return null;

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    onSend(text);
  };

  return (
    <section
      ref={drawerRef}
      className="assistant-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Assistant chat"
    >
      <div className="assistant-drawer-header">
        <div className="assistant-drawer-heading">
          <span className="assistant-drawer-title">Assistant</span>
          <span className="assistant-disclosure">
            AI assistant — a guided helper that can look up products, prices and your orders.
          </span>
        </div>
        <div className="assistant-drawer-actions">
          <button
            type="button"
            className="assistant-icon-button"
            aria-label="Clear chat"
            title="Clear chat"
            onClick={onClear}
            disabled={sending}
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            className="assistant-icon-button"
            aria-label="Close assistant chat"
            title="Close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Announces new assistant replies to assistive technology. */}
      <div className="assistant-live" aria-live="polite" role="status">
        {lastAssistant ? lastAssistant.text : ''}
      </div>

      <div className="assistant-messages" ref={messagesRef}>
        {messages.length === 0 ? (
          <p className="assistant-empty">
            Hi! Ask me about a product, a price estimate, or the status of one of your
            orders — or pick one of the suggestions below.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`assistant-message assistant-message-${message.role}`}
            >
              <div className="assistant-bubble">{message.text}</div>
              {message.proposal && (
                <ProposalCard
                  proposal={message.proposal}
                  state={message.proposalState}
                  review={Boolean(message.proposalReview)}
                  onConfirm={onConfirmProposal}
                  onDismiss={onDismissProposal}
                />
              )}
              {message.role === 'assistant' && (
                <div className="assistant-feedback">
                  <button
                    type="button"
                    className="assistant-feedback-button"
                    aria-label="Thumbs up"
                    aria-pressed={feedback[message.id] === 'up'}
                    onClick={() => onFeedback(message.id, 'up')}
                  >
                    <ThumbsUp size={13} />
                  </button>
                  <button
                    type="button"
                    className="assistant-feedback-button"
                    aria-label="Thumbs down"
                    aria-pressed={feedback[message.id] === 'down'}
                    onClick={() => onFeedback(message.id, 'down')}
                  >
                    <ThumbsDown size={13} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {sending && (
          <div className="assistant-message assistant-message-assistant">
            <div className="assistant-bubble assistant-typing" aria-label="Assistant is typing">
              <span className="assistant-typing-dot" aria-hidden="true" />
              <span className="assistant-typing-dot" aria-hidden="true" />
              <span className="assistant-typing-dot" aria-hidden="true" />
              <span className="assistant-typing-text">Assistant is typing…</span>
            </div>
          </div>
        )}
      </div>

      {canExtractPo && (
        <div className="assistant-extract">
          <input
            ref={fileInputRef}
            type="file"
            className="assistant-extract-input"
            aria-label="PO file"
            accept=".pdf,.xlsx,.csv,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handlePoFile}
            disabled={extracting}
          />
          <button
            type="button"
            className="assistant-extract-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting || sending}
          >
            <FileUp size={14} />
            {extracting ? 'Extracting…' : 'Extract from PO'}
          </button>
          <span className="assistant-extract-hint">
            Staff: upload a purchase order (PDF, XLSX or CSV) to draft an order from it.
          </span>
          {extracting && (
            <div
              className="assistant-extract-progress"
              role="progressbar"
              aria-label="PO upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={typeof extractProgress === 'number' ? extractProgress : undefined}
            >
              <div
                className={`assistant-extract-progress-bar${
                  typeof extractProgress === 'number'
                    ? ''
                    : ' assistant-extract-progress-indeterminate'
                }`}
                style={
                  typeof extractProgress === 'number'
                    ? { width: `${extractProgress}%` }
                    : undefined
                }
              />
            </div>
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className="assistant-chips" aria-label="Suggested messages">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="assistant-chip"
              onClick={() => onChip(chip)}
              disabled={sending}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <form className="assistant-composer" onSubmit={handleSubmit}>
        <label className="assistant-input-label" htmlFor="assistant-message-input">
          Message the assistant
        </label>
        <input
          id="assistant-message-input"
          ref={inputRef}
          className="assistant-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message…"
          disabled={sending}
          autoComplete="off"
        />
        <button
          type="submit"
          className="assistant-send-button"
          aria-label="Send message"
          disabled={sending || !draft.trim()}
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  );
};

export default AssistantDrawer;
