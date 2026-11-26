// Admin Console v2 helpers (v0.9 F1) — pure, testable utilities shared by
// the Kanban board, Orders tab, Customers tab and Audit tab.
//
// INVOICE CONSTRAINT: figures are read verbatim from API payloads
// (order.totalAmount etc.) and only formatted for display / CSV. Nothing
// is summed, taxed or recomputed here.

export const ORDER_STATUSES = [
  'Draft',
  'Submitted',
  'Under Review',
  'Confirmed',
  'In Production',
  'Dispatched',
  'Completed',
  'Cancelled',
];

// Roles the app already uses: 'buyer' plus STAFF_ROLES from
// src/hooks/useBuyerDashboard.js, plus the generic 'staff' role checked
// by DocumentsPanel / PayPanel.
export const USER_ROLES = [
  'buyer',
  'staff',
  'admin',
  'sales_manager',
  'production_supervisor',
  'qc_inspector',
  'shipping_officer',
  'super_admin',
];

export const SAVED_FILTERS_KEY = 'hao_saved_order_filters';

export const loadSavedFilters = (storage = globalThis.localStorage) => {
  try {
    const raw = storage?.getItem(SAVED_FILTERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((f) => f && typeof f.name === 'string') : [];
  } catch {
    return [];
  }
};

export const persistSavedFilters = (filters, storage = globalThis.localStorage) => {
  try {
    storage?.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // storage unavailable (private mode) — filters simply don't persist
  }
};

export const upsertSavedFilter = (filters, entry) => {
  const next = filters.filter((f) => f.name !== entry.name);
  next.push(entry);
  return next;
};

const csvEscape = (value) => {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const ordersToCsv = (orders = []) => {
  const header = ['Order Number', 'Date', 'Buyer', 'Business', 'Country', 'Status', 'Total (USD)', 'Items', 'Quantity'];
  const rows = orders.map((o) => [
    o.orderNumber || '',
    o.createdAt ? new Date(o.createdAt).toISOString() : '',
    o.customerDetails?.customerName || '',
    o.customerDetails?.businessName || '',
    o.customerDetails?.country || '',
    o.status || '',
    typeof o.totalAmount === 'number' ? o.totalAmount.toFixed(2) : (o.totalAmount ?? ''),
    Array.isArray(o.items) ? o.items.length : '',
    o.totalQuantity ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
};

export const downloadCsv = (filename, csvText) => {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const actorLabel = (actor) => {
  if (!actor) return '—';
  if (typeof actor === 'string') return actor;
  return actor.customerName || actor.name || actor.email || actor.username || actor._id || '—';
};

// Run a per-order status update for many orders, collecting per-order
// results instead of failing fast. `updateFn(id, payload)` returns a promise.
export const runBulkStatusUpdate = async (orders, targetStatus, updateFn) => {
  const succeeded = [];
  const failed = [];
  for (const order of orders) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await updateFn(order._id, { status: targetStatus, note: `Status changed to ${targetStatus} by Admin (bulk)` });
      succeeded.push(order);
    } catch (err) {
      failed.push({ order, error: err?.message || 'Request failed' });
    }
  }
  return { succeeded, failed };
};
