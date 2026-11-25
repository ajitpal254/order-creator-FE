import { apiRequest } from './client';

// Admin reports API (v0.6 F3 — admin reports view).
// Backend contract (built in parallel for v0.6):
//   GET /api/reports/revenue?groupBy=product|buyer|country&from&to
//   GET /api/reports/receivables-ageing   -> { buckets[], totalOutstanding }
//   GET /api/reports/backlog              -> open orders grouped by status
//   The revenue and receivables-ageing endpoints return a CSV file when
//   called with ?format=csv.
//
// Every figure in these payloads is computed server-side. This module
// (and the reports UI) only passes values through for display — nothing
// is summed, averaged or otherwise re-aggregated client-side.

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

// Authenticated CSV download, mirroring orderApi.downloadPdf in
// client.js exactly: authenticated fetch (Authorization header — the
// token never travels in the URL) -> blob -> object URL -> anchor
// click -> revoke.
const downloadCsv = async (endpoint, filename) => {
  const token = localStorage.getItem('hao_token');
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const errJson = await response.json().catch(() => null);
    throw new Error(errJson?.message || 'Failed to download CSV');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const reportsApi = {
  getRevenue: ({ groupBy = 'product', from, to } = {}) =>
    apiRequest(`/reports/revenue${buildQuery({ groupBy, from, to })}`),

  getReceivablesAgeing: () => apiRequest('/reports/receivables-ageing'),

  getBacklog: () => apiRequest('/reports/backlog'),

  downloadRevenueCsv: ({ groupBy = 'product', from, to } = {}) =>
    downloadCsv(
      `/reports/revenue${buildQuery({ groupBy, from, to, format: 'csv' })}`,
      `HAO_Revenue_by-${groupBy}.csv`
    ),

  downloadAgeingCsv: () =>
    downloadCsv(
      `/reports/receivables-ageing${buildQuery({ format: 'csv' })}`,
      'HAO_Receivables_Ageing.csv'
    ),
};
