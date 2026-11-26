import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { StatusBadge } from '../StatusBadge';
import {
  MoreHorizontal,
  Eye,
  FileDown,
  Wallet,
  AlertTriangle,
  CircleDollarSign,
} from 'lucide-react';
import '../invoice/invoices.css';

// Admin "Invoices" tab (FE-11) — presentation only.
//
// Rows reuse the admin orders data flow already loaded by AdminDashboard
// (useAdminData -> orderApi.getAllOrders); no new orders fetch happens
// here. The three metric cards come from the v0.6 reports endpoints and
// every figure is displayed EXACTLY as the API returns it — nothing is
// re-aggregated, summed or converted in this component.
//
// The reports payloads are read defensively (the backend is built in
// parallel): the ageing response is { buckets[], totalOutstanding } where
// each bucket carries a label/key plus an amount field; the revenue
// response carries its headline figure under a total-style field. The
// first matching field wins; unknown shapes render an em dash rather
// than a fabricated number.

const AMOUNT_FIELDS = ['amount', 'total', 'totalAmount', 'outstanding', 'totalOutstanding', 'value', 'balance'];
const REVENUE_FIELDS = ['totalRevenue', 'totalPaid', 'paidThisMonth', 'revenue', 'total', 'amount'];

const pickFigure = (obj, fields) => {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const field of fields) {
    if (typeof obj[field] === 'number') return obj[field];
  }
  return undefined;
};

const unwrap = (res) => (res && typeof res === 'object' && 'data' in res ? res.data : res);

const formatMoney = (value) =>
  typeof value === 'number' ? `$${value.toFixed(2)}` : '—';

const monthRange = () => {
  const now = new Date();
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

export const InvoicesTab = ({ orders, onViewOrder, handleDownloadPdf, downloadingPdfId }) => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [openMenuId, setOpenMenuId] = useState(null);

  const { from, to } = useMemo(monthRange, []);

  const { data: ageingRes } = useQuery({
    queryKey: ['reports', 'receivables-ageing'],
    queryFn: () => apiRequest('/reports/receivables-ageing'),
  });

  const { data: revenueRes } = useQuery({
    queryKey: ['reports', 'revenue', 'buyer', from, to],
    queryFn: () => apiRequest(`/reports/revenue?groupBy=buyer&from=${from}&to=${to}`),
  });

  const ageing = unwrap(ageingRes);
  const buckets = Array.isArray(ageing?.buckets) ? ageing.buckets : [];
  const overdueBucket = buckets.find((b) => /overdue/i.test(b?.key || '') || /overdue/i.test(b?.label || ''));
  const totalOutstanding = pickFigure(ageing, ['totalOutstanding']);
  const overdueAmount = pickFigure(overdueBucket, AMOUNT_FIELDS);
  const paidThisMonth = pickFigure(unwrap(revenueRes), REVENUE_FIELDS);

  const statuses = useMemo(
    () => ['All', ...new Set(orders.map((o) => o.status).filter(Boolean))],
    [orders]
  );

  const filteredOrders = orders.filter(
    (o) => statusFilter === 'All' || o.status === statusFilter
  );

  // Close the overflow menu on any outside click.
  useEffect(() => {
    if (!openMenuId) return undefined;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  return (
    <div>
      {/* Metric cards — figures exactly as the reports API returns them */}
      <div className="invoice-metrics">
        <div className="glass-card invoice-metric-card">
          <span className="invoice-metric-label">
            <Wallet size={14} /> Outstanding
          </span>
          <div className="invoice-metric-value is-outstanding">{formatMoney(totalOutstanding)}</div>
          <div className="invoice-metric-note">Total receivables outstanding</div>
        </div>

        <div className="glass-card invoice-metric-card">
          <span className="invoice-metric-label">
            <AlertTriangle size={14} /> Overdue
          </span>
          <div className="invoice-metric-value is-overdue">{formatMoney(overdueAmount)}</div>
          <div className="invoice-metric-note">Overdue bucket from receivables ageing</div>
        </div>

        <div className="glass-card invoice-metric-card">
          <span className="invoice-metric-label">
            <CircleDollarSign size={14} /> Paid This Month
          </span>
          <div className="invoice-metric-value is-paid">{formatMoney(paidThisMonth)}</div>
          <div className="invoice-metric-note">Revenue reported for the current month</div>
        </div>
      </div>

      <div className="glass-card">
        {/* Status filter chips — statuses present in the loaded data */}
        <div className="invoice-filter-chips">
          {statuses.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
            >
              {st}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No invoices match your filter criteria.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Buyer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Total (USD)</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => (
                  <tr key={ord._id}>
                    <td>
                      <b style={{ color: '#FFFFFF' }}>{ord.orderNumber}</b>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFFFFF' }}>
                        {ord.customerDetails?.customerName || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ord.customerDetails?.businessName}
                      </div>
                    </td>
                    <td>
                      {new Date(ord.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <StatusBadge status={ord.status} />
                    </td>
                    <td>{ord.paymentStatus || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-amber)' }}>
                      ${ord.totalAmount?.toFixed(2)}
                    </td>
                    <td className="invoice-menu-cell">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm invoice-menu-button"
                        aria-label={`Actions for ${ord.orderNumber}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === ord._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === ord._id ? null : ord._id);
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuId === ord._id && (
                        <div className="invoice-menu" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            className="invoice-menu-item"
                            onClick={() => {
                              setOpenMenuId(null);
                              onViewOrder?.(ord);
                            }}
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="invoice-menu-item"
                            disabled={downloadingPdfId === ord._id}
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDownloadPdf?.(ord._id, ord.orderNumber);
                            }}
                          >
                            <FileDown size={14} />
                            <span>
                              {downloadingPdfId === ord._id ? 'Downloading...' : 'Download PDF'}
                            </span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
