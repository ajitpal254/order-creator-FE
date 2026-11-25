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
