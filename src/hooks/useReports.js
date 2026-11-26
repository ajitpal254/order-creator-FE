import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';

// Admin reports data (v0.6 F3).
//
// Reads go through TanStack Query on top of src/api/reports.js, following
// the pattern of useOrders / useBuyerDashboard: stable query keys and the
// { success, data } envelope unwrapped.
//
// DISPLAY-ONLY CONSTRAINT: the helpers below only SELECT which returned
// fields to show (a row's label/name, its amount/total, a bucket's
// amount, a status count). No figure is ever summed, averaged or
// otherwise computed client-side — totals such as totalOutstanding are
// rendered exactly as the API returned them.

export const reportKeys = {
  all: ['reports'],
  revenue: (params) => ['reports', 'revenue', params],
  ageing: ['reports', 'receivables-ageing'],
  backlog: ['reports', 'backlog'],
};

// Unwrap the standard { success, data } envelope when present; otherwise
// hand the payload back untouched.
export const unwrapReport = (res) => {
  if (res && typeof res === 'object' && 'data' in res && res.data != null) {
    return res.data;
  }
  return res;
};

// Pull the row array out of a report payload, tolerating the shapes the
// endpoint may use: a bare array, or an object carrying the rows under a
// named key.
const rowsFrom = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
};

export const getRevenueRows = (payload) =>
  rowsFrom(payload, ['rows', 'revenue', 'results', 'items', 'groups']);

export const getAgeingBuckets = (payload) =>
  rowsFrom(payload, ['buckets', 'ageing', 'rows', 'results']);

export const getBacklogRows = (payload) =>
  rowsFrom(payload, ['groups', 'backlog', 'statuses', 'rows', 'results', 'items']);

// --- Field selection (display only — never arithmetic) ---

// A row's display label: the API's label/name-style field, whichever it
// returns for the grouping in question.
export const rowLabel = (row) =>
  row?.label ??
  row?.name ??
  row?.group ??
  row?.key ??
  row?.status ??
  row?.productName ??
  row?.buyerName ??
  row?.country ??
  '—';

// A row's headline figure: the API's amount/total-style field.
export const rowAmount = (row) =>
  row?.amount ??
  row?.total ??
  row?.totalAmount ??
  row?.revenue ??
  row?.totalRevenue ??
  row?.totalOutstanding ??
  row?.outstanding ??
  row?.balance ??
  row?.value ??
  null;

// A row's count-style field, when the API returns one.
export const rowCount = (row) =>
  row?.count ?? row?.orderCount ?? row?.orders ?? row?.invoiceCount ?? row?.quantity ?? null;

// Revenue grouped by product | buyer | country over an optional
// from/to date range. Refetches whenever the grouping or range changes
// because they are part of the query key.
export function useRevenue({ groupBy = 'product', from = '', to = '' } = {}) {
  const params = { groupBy, from: from || undefined, to: to || undefined };
  return useQuery({
    queryKey: reportKeys.revenue(params),
    queryFn: async () => unwrapReport(await reportsApi.getRevenue(params)),
  });
}

// Receivables ageing: { buckets[], totalOutstanding } as returned.
export function useReceivablesAgeing() {
  return useQuery({
    queryKey: reportKeys.ageing,
    queryFn: async () => unwrapReport(await reportsApi.getReceivablesAgeing()),
  });
}

// Production backlog: open orders grouped by status, as returned.
export function useBacklog() {
  return useQuery({
    queryKey: reportKeys.backlog,
    queryFn: async () => unwrapReport(await reportsApi.getBacklog()),
  });
}
