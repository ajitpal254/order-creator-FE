import { apiRequest, apiUpload } from './client';

// Assistant API (v0.7 FEAT-16 Stages 1–2 — F1 assistant chat drawer).
// Backend contract:
//   POST   /api/assistant/message            body { message, conversationId? }
//                                            -> { conversationId, reply, chips[] }
//   POST   /api/assistant/handoff            body { conversationId?, transcript, note? }
//                                            -> { ok }
//   POST   /api/assistant/feedback           body { conversationId, rating }
//                                            (rating: "up" | "down")
//   GET    /api/assistant/faq                -> FAQ content (shape flexible)
//   DELETE /api/assistant/conversations/:id  -> deletes the conversation
// v1.0 (FEAT-16 Stages 3–4 — F2): a message response may also carry a
//   proposal { id, kind, summary, payload, expiresAt } the user can act on:
//   POST   /api/assistant/proposals/:id/confirm  -> { order } (created draft)
//   POST   /api/assistant/proposals/:id/dismiss  -> dismisses the proposal
//   POST   /api/assistant/extract-po             multipart upload, field
//          name 'file' (PDF/XLSX/CSV) -> { proposal } (same proposal shape)
// Confirm/dismiss take NO body — in particular the confirm endpoint cannot
// receive edited proposal lines, so the PO review UI is review-only (see
// ProposalCard).
// All calls go through apiRequest so the auth token + silent refresh are
// handled exactly like every other module. The assistant only ever
// displays what the API returns — no prices/totals are computed here.
export const assistantApi = {
  sendMessage: ({ message, conversationId } = {}) =>
    apiRequest('/assistant/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        ...(conversationId ? { conversationId } : {}),
      }),
    }),

  sendHandoff: ({ conversationId, transcript, note } = {}) =>
    apiRequest('/assistant/handoff', {
      method: 'POST',
      body: JSON.stringify({
        ...(conversationId ? { conversationId } : {}),
        transcript,
        ...(note ? { note } : {}),
      }),
    }),

  sendFeedback: ({ conversationId, rating } = {}) =>
    apiRequest('/assistant/feedback', {
      method: 'POST',
      body: JSON.stringify({
        ...(conversationId ? { conversationId } : {}),
        rating,
      }),
    }),

  getFaq: () => apiRequest('/assistant/faq'),

  deleteConversation: (id) =>
    apiRequest(`/assistant/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  confirmProposal: (id) =>
    apiRequest(`/assistant/proposals/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
    }),

  dismissProposal: (id) =>
    apiRequest(`/assistant/proposals/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST',
    }),

  // Staff PO extraction: the file is uploaded as multipart form data and
  // parsed SERVER-side (no client-side PDF/XLSX parsing). apiUpload is the
  // XHR-based client helper so the drawer can show real upload progress.
  extractPo: (file, { onProgress } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload('/assistant/extract-po', formData, { onProgress });
  },
};

// Named exports mirroring the object API, for callers that prefer them.
export const sendMessage = assistantApi.sendMessage;
export const sendHandoff = assistantApi.sendHandoff;
export const sendFeedback = assistantApi.sendFeedback;
export const getFaq = assistantApi.getFaq;
export const deleteConversation = assistantApi.deleteConversation;
export const confirmProposal = assistantApi.confirmProposal;
export const dismissProposal = assistantApi.dismissProposal;
export const extractPo = assistantApi.extractPo;
