// Shared fixtures for the Vitest + MSW suite (QOL-04).
//
// Shapes mirror the real API responses consumed by src/api/client.js callers:
//  - auth endpoints resolve { success, token, user }
//  - list endpoints resolve { success, data }
// Figures (prices, totals) are fixture values returned by the mocked API.
// Display tests assert the UI renders THESE values verbatim — pricing is
// never recomputed in the tests beyond reading fixture fields.

export const API_BASE = 'http://localhost:5000/api';

export const buyerUser = {
  _id: 'user-buyer-1',
  customerName: 'Johnathan Smith',
  businessName: 'Apex Industrial Supplies LLC',
  country: 'United States',
  phoneNumber: '+1 (555) 349-2910',
  address: 'Suite 400, Industrial Parkway, Houston, TX 77001, USA',
  username: 'apex_tools',
  email: 'buyer@apex.example.com',
  role: 'buyer',
};

export const adminUser = {
  ...buyerUser,
  _id: 'user-admin-1',
  customerName: 'H.A. Overseas Admin',
  username: 'haoadmin',
  email: 'admin@haoverseas.example.com',
  role: 'admin',
};

export const loginSuccess = {
  success: true,
  token: 'access-token-1',
  user: buyerUser,
};

export const products = [
  {
    _id: 'prod-1',
    name: 'Combination Spanner Set 14pc',
    sku: 'HAO-CS-014',
    category: 'Spanners',
    basePrice: 12.5,
    moq: 100,
    weightKg: 0.5,
    pcsPerCarton: 20,
    allowedSizes: ['8-19mm'],
    allowedFinishes: ['Chrome Plated'],
    allowedColors: ['Industrial Red'],
    allowedBrands: ['H.A. Overseas'],
    images: [],
  },
  {
    _id: 'prod-2',
    name: 'Lever Grease Gun 400cc',
    sku: 'HAO-GG-400',
    category: 'Grease Guns',
    basePrice: 9.75,
    moq: 50,
    weightKg: 1.2,
    pcsPerCarton: 10,
    allowedSizes: ['400cc'],
    allowedFinishes: ['Powder Coated'],
    allowedColors: ['Industrial Red'],
    allowedBrands: ['H.A. Overseas'],
    images: [],
  },
];

export const attributes = {
  finishes: [{ _id: 'fin-1', name: 'Chrome Plated' }],
  colors: [{ _id: 'col-1', name: 'Industrial Red' }],
  brands: [{ _id: 'br-1', name: 'H.A. Overseas' }],
  sizes: [{ _id: 'siz-1', label: '8-19mm' }],
  categories: [{ _id: 'cat-1', name: 'Spanners' }],
};

// Order templates (FE-12). The template carries the same draft payload
// shape the order-creation API accepts; create-order returns the order
// built from it (myOrders[0] below).
export const templates = [
  {
    _id: 'tpl-1',
    name: 'Apex standard spanner order',
    items: [
      {
        product: 'prod-1',
        productName: 'Combination Spanner Set 14pc',
        sku: 'HAO-CS-014',
        size: '8-19mm',
        finish: 'Chrome Plated',
        color: 'Industrial Red',
        brand: 'H.A. Overseas',
        packaging: 'Master Carton (Standard Export)',
        customMarking: '',
        quantity: 200,
        unitPrice: 12.5,
        totalPrice: 2500.0,
      },
    ],
    shippingMarks: 'APEX / LOT 44',
    specialInstructions: '',
  },
];

// Assistant (v0.7 FEAT-16 Stages 1–2). The reply/chips are values returned
// by the mocked API and rendered verbatim by the drawer.
export const assistantReply = {
  conversationId: 'conv-1',
  reply: 'Your order HAO-2026-100001 is in production.',
  chips: ['Track my order', 'Talk to a person'],
};

export const assistantFaq = [
  {
    q: 'What is the minimum order quantity?',
    a: 'It depends on the product — each catalog item shows its own MOQ.',
  },
  {
    q: 'How do I track my order?',
    a: 'Open My Orders and choose the order you want to follow.',
  },
];

// One order whose line total and grand total are fixture values straight
// from the (mocked) API: 200 pcs x $12.50 = $2500.00 totalPrice, and the
// order-level totalAmount is the same figure.
export const myOrders = [
  {
    _id: 'order-1',
    orderNumber: 'HAO-2026-100001',
    status: 'In Production',
    createdAt: '2026-11-20T10:30:00.000Z',
    totalQuantity: 200,
    totalAmount: 2500.0,
    estimatedWeightKg: 100,
    shippingMarks: 'APEX / LOT 44',
    timeline: [
      {
        status: 'Submitted',
        note: 'Order received by export desk',
        updatedAt: '2026-11-20T10:30:00.000Z',
      },
    ],
    items: [
      {
        product: 'prod-1',
        productName: 'Combination Spanner Set 14pc',
        sku: 'HAO-CS-014',
        size: '8-19mm',
        finish: 'Chrome Plated',
        color: 'Industrial Red',
        brand: 'H.A. Overseas',
        packaging: 'Master Carton (Standard Export)',
        customMarking: '',
        quantity: 200,
        unitPrice: 12.5,
        totalPrice: 2500.0,
      },
    ],
  },
];

// ---- v0.9 F1 Admin Console v2 (appended) ----
export const adminOrdersV09 = [
  {
    _id: 'order-v09-1', orderNumber: 'HAO-2026-100201', status: 'Submitted',
    createdAt: '2026-11-21T10:00:00.000Z', totalQuantity: 100, totalAmount: 1500,
    estimatedWeightKg: 50, estimatedCartons: 5,
    customerDetails: { customerName: 'Johnathan Smith', businessName: 'Apex Industrial Supplies LLC', country: 'United States' },
    items: [{ product: 'prod-1' }],
  },
  {
    _id: 'order-v09-2', orderNumber: 'HAO-2026-100202', status: 'Confirmed',
    createdAt: '2026-11-22T10:00:00.000Z', totalQuantity: 40, totalAmount: 800.5,
    estimatedWeightKg: 20, estimatedCartons: 2,
    customerDetails: { customerName: 'Maria Garcia', businessName: 'Garcia Tools SA', country: 'Spain' },
    items: [],
  },
];

export const auditLogsV09 = [
  {
    _id: 'audit-1', actor: { customerName: 'H.A. Overseas Admin', email: 'admin@haoverseas.example.com' },
    action: 'order.status_updated', entityType: 'Order', entityId: 'order-v09-1',
    before: { status: 'Submitted' }, after: { status: 'Confirmed' },
    ip: '127.0.0.1', requestId: 'req-1', createdAt: '2026-11-22T12:00:00.000Z',
  },
  {
    _id: 'audit-2', actor: 'system', action: 'user.role_changed', entityType: 'User', entityId: 'user-buyer-1',
    before: { role: 'buyer' }, after: { role: 'staff' },
    ip: '127.0.0.1', requestId: 'req-2', createdAt: '2026-11-22T13:00:00.000Z',
  },
];

export const customersV09 = [
  { ...buyerUser, createdAt: '2026-10-01T10:00:00.000Z' },
  { _id: 'user-2', customerName: 'Maria Garcia', businessName: 'Garcia Tools SA', country: 'Spain', phoneNumber: '+34 600 000 000', address: 'Madrid, Spain', username: 'garcia', email: 'maria@garcia.example.com', role: 'buyer', createdAt: '2026-10-02T10:00:00.000Z' },
];
