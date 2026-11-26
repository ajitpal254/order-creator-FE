import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../api/client';
import { buyerOrdersApi } from '../api/buyerOrders';

// Buyer dashboard data + actions (FE-13).
//
// Reads go through TanStack Query on top of the existing API client. The
// dashboard fetches the buyer's orders WITH drafts included (see
// src/api/buyerOrders.js) under its own query key so it never clashes
// with the drafts-excluded cache entry used by MyOrdersPage.
//
// INVOICE CONSTRAINT: every figure shown by the dashboard is read
// verbatim from the API payload (order.totalAmount, invoice.balanceDue,
// invoice.amountPaid). Nothing is summed, taxed or recomputed here, and
// PDFs still come from orderApi.downloadPdf, unchanged.

// Roles that get the staff/admin experience instead of the buyer
// dashboard. Anyone NOT in this set (e.g. 'buyer', 'user') is a buyer.
export const STAFF_ROLES = [
  'admin',
  'sales_manager',
  'production_supervisor',
  'qc_inspector',
  'shipping_officer',
  'super_admin',
];

export const isBuyerUser = (user) => Boolean(user) && !STAFF_ROLES.includes(user.role);

// Terminal order statuses: an order in one of these needs nothing more
// and is not "active".
export const TERMINAL_STATUSES = ['Completed', 'Cancelled'];

export const buyerOrderKeys = {
  withDrafts: ['orders', 'my', 'with-drafts'],
};

// The signed-in buyer's orders, drafts included, envelope unwrapped the
// same way useMyOrders does ({ success, data } -> data).
export function useBuyerOrders() {
  return useQuery({
    queryKey: buyerOrderKeys.withDrafts,
    queryFn: async () => {
      const res = await buyerOrdersApi.getMyOrdersIncludingDrafts();
      return res?.success ? res.data : [];
    },
  });
}

// "Active orders": in-flight orders — not terminal, and not Draft
// (drafts are not active yet; they live in "Awaiting your action").
export const getActiveOrders = (orders = []) =>
  orders.filter(
    (order) => !TERMINAL_STATUSES.includes(order.status) && order.status !== 'Draft'
  );

// "Awaiting your action" (i): orders still in Draft, not yet submitted.
export const getDraftOrders = (orders = []) =>
  orders.filter((order) => order.status === 'Draft');

// Invoice payment states (the Invoice model's status enum on the
// backend) that mean money is still owed once an invoice has been
// issued: sent-but-unpaid, partially paid, or overdue. 'draft' invoices
// have not been issued to the buyer yet, 'paid'/'void' need no action.
const UNPAID_INVOICE_STATUSES = ['sent', 'partial', 'overdue'];

// Fallback for a top-level paymentStatus field, if the API ever returns
// one on the order (normalised lowercase spellings).
const UNPAID_PAYMENT_STATUSES = [
  'unpaid',
  'partial',
  'partially paid',
  'partially_paid',
  'partiallypaid',
  'overdue',
  'due',
];

// "Awaiting your action" (iii): does this order's API payload indicate an
// unpaid / partially-paid invoice? Keys on the order's embedded invoice
// summary (order.invoice.status — the invoice's payment status, mirrored
// onto the order by the backend when the invoice is generated), falling
// back to a top-level order.paymentStatus when present.
//
// Returns null when nothing is owed, otherwise the invoice figures
// EXACTLY as the API returned them (never recomputed):
//   { invoiceId, status, balanceDue, amountPaid }
// balanceDue / amountPaid are null when the payload does not carry them.
export const getUnpaidInvoice = (order) => {
  const invoice = order?.invoice;
  if (invoice && typeof invoice === 'object') {
    const status =
      typeof invoice.status === 'string' ? invoice.status.toLowerCase() : '';
    if (UNPAID_INVOICE_STATUSES.includes(status)) {
      return {
        invoiceId: invoice.invoiceId ?? null,
        status: invoice.status,
        balanceDue: typeof invoice.balanceDue === 'number' ? invoice.balanceDue : null,
        amountPaid: typeof invoice.amountPaid === 'number' ? invoice.amountPaid : null,
      };
    }
    // A known invoice in any other state (draft/sent-paid/paid/void)
    // settles the question — nothing owed on this order.
    if (status) return null;
  }

  const paymentStatus = order?.paymentStatus;
  if (
    typeof paymentStatus === 'string' &&
    UNPAID_PAYMENT_STATUSES.includes(paymentStatus.trim().toLowerCase())
  ) {
    return {
      invoiceId: null,
      status: paymentStatus,
      balanceDue:
        typeof order.balanceDue === 'number' ? order.balanceDue : null,
      amountPaid:
        typeof order.amountPaid === 'number' ? order.amountPaid : null,
    };
  }

  return null;
};

export const getUnpaidInvoiceOrders = (orders = []) =>
  orders
    .map((order) => ({ order, invoice: getUnpaidInvoice(order) }))
    .filter((entry) => entry.invoice !== null);

// "Order again": build the POST /orders payload for a NEW draft cloned
// from a past order. The shape mirrors OrderContext.submitOrder exactly
// ({ items, shippingMarks, specialInstructions,
// customerDetailsOverride }) and each item carries the same fields the
// order creator's configurator puts on a cart item (see
// useOrderConfigurator.handleAddLineItem). weightKg / pcsPerCarton ride
// on the past item's frozen snapshot when the API returned one.
// `status: 'Draft'` is the create endpoint's own supported way to save
// a draft instead of submitting (backend createOrder honours it).
// Prices are copied verbatim from the past order's API payload — the
// server re-validates/re-prices on create; the dashboard computes
// nothing.
export const buildReorderPayload = (order) => ({
  items: (order?.items || []).map((item) => ({
    product: item.product ?? null,
    productName: item.productName,
    sku: item.sku,
    size: item.size,
    finish: item.finish,
    color: item.color,
    brand: item.brand,
    packaging: item.packaging,
    customMarking: item.customMarking || '',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    ...(typeof item.snapshot?.weightKg === 'number'
      ? { weightKg: item.snapshot.weightKg }
      : {}),
    ...(typeof item.snapshot?.pcsPerCarton === 'number'
      ? { pcsPerCarton: item.snapshot.pcsPerCarton }
      : {}),
  })),
  shippingMarks: order?.shippingMarks || '',
  specialInstructions: order?.specialInstructions || '',
  customerDetailsOverride: null,
  status: 'Draft',
});

// Creates the cloned draft via the EXISTING orderApi.createOrder
// (POST /orders). On success the order lists are invalidated so the new
// draft shows up in My Orders / the dashboard's awaiting-action section.
export function useReorderOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (order) => {
      const res = await orderApi.createOrder(buildReorderPayload(order));
      if (!res?.success) {
        throw new Error(res?.message || 'Failed to create the new draft order.');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
