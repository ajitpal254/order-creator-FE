import { apiRequest } from './client';

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
};

// Named exports mirroring the object API, for callers that prefer them.
export const sendMessage = assistantApi.sendMessage;
export const sendHandoff = assistantApi.sendHandoff;
export const sendFeedback = assistantApi.sendFeedback;
export const getFaq = assistantApi.getFaq;
export const deleteConversation = assistantApi.deleteConversation;
