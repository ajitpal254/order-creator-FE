import { apiRequest } from './client';

// Saved addresses API (v0.5 F3 — addresses + reorder + FX display).
// Backend contract:
//   GET    /api/addresses        -> { success, data: [...] }
//   POST   /api/addresses        -> create one saved address
//   PUT    /api/addresses/:id    -> update one saved address
//   DELETE /api/addresses/:id    -> delete one saved address
// Address shape: { _id, label, type: 'bill-to' | 'ship-to', line1, line2,
//                  city, state, country, postalCode }.
export const addressesApi = {
  list: () => apiRequest('/addresses'),
  create: (address) =>
    apiRequest('/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    }),
  update: (id, address) =>
    apiRequest(`/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(address),
    }),
  remove: (id) =>
    apiRequest(`/addresses/${id}`, {
      method: 'DELETE',
    }),
};

// Stable TanStack Query keys for address data.
export const addressKeys = {
  all: ['addresses'],
  list: ['addresses', 'list'],
};

// The two address types the backend accepts, with their display labels.
export const ADDRESS_TYPES = [
  { value: 'bill-to', label: 'Bill-to' },
  { value: 'ship-to', label: 'Ship-to' },
];

export const addressTypeLabel = (type) =>
  ADDRESS_TYPES.find((t) => t.value === type)?.label || type;

// Blank form state for the add/edit address form — field names match the
// backend contract exactly.
export const emptyAddress = (type = 'bill-to') => ({
  label: '',
  type,
  line1: '',
  line2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
});

// The editable fields of a saved address (everything except id/type
// bookkeeping), in contract order. Used when a saved address fills the
// order form and when the settings form is populated for editing.
export const pickAddressFields = (address = {}) => ({
  label: address.label || '',
  line1: address.line1 || '',
  line2: address.line2 || '',
  city: address.city || '',
  state: address.state || '',
  country: address.country || '',
  postalCode: address.postalCode || '',
});

// True when any editable field carries a value (used to decide whether
// the order's bill-to / ship-to block should ride along on submit).
export const isAddressFilled = (address) =>
  Boolean(
    address &&
      Object.values(pickAddressFields(address)).some((v) => String(v).trim() !== '')
  );

// One-line rendering of a saved address for lists and picker options.
export const formatAddress = (address = {}) =>
  [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(', '),
    address.country,
    address.postalCode,
  ]
    .filter((part) => part && String(part).trim() !== '')
    .join(' · ');
