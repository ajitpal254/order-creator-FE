import { apiRequest } from './client';

// Notifications API (v0.4 FEAT — F1 notifications bell).
// Backend contract:
//   GET   /api/notifications                -> { success, data: [...], total, page, limit }
//                                              (supports ?unread=true)
//   GET   /api/notifications/unread-count   -> { success, count }
//   PATCH /api/notifications/:id/read
//   POST  /api/notifications/read-all
// Item shape: { _id or id, type, title, body, link, read, createdAt }.
export const notificationsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/notifications${query ? `?${query}` : ''}`);
  },
  unreadCount: async () => {
    const res = await apiRequest('/notifications/unread-count');
    // Contract is { success, count }; tolerate a missing count as 0.
    return typeof res?.count === 'number' ? res.count : 0;
  },
  markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),
};

// Stable TanStack Query keys for notification data.
export const notificationKeys = {
  all: ['notifications'],
  list: ['notifications', 'list'],
  unreadCount: ['notifications', 'unread-count'],
};
