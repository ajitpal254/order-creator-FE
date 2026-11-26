import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, invoiceApi } from '../../api/client';
import { Modal } from '../Modal';
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

const invoiceIdFor = (ord) =>
  ord?.invoiceId || ord?.invoice?._id || ord?.invoice?.invoiceId || ord?.invoice?.id || ord?._id;

export const InvoicesTab = ({ orders, onViewOrder, handleDownloadPdf, downloadingPdfId }) => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [gstData, setGstData] = useState(null);
  const [gstOrder, setGstOrder] = useState(null);
  const [gstError, setGstError] = useState(null);
  const [irnMessage, setIrnMessage] = useState(null);
  const [irnError, setIrnError] = useState(null);
  const [irnBusyId, setIrnBusyId] = useState(null);

  const handleViewGstQr = async (ord) => {
    setGstError(null); setIrnMessage(null); setIrnError(null);
    try {
      const res = await invoiceApi.getGstQr(invoiceIdFor(ord));
      const data = res && typeof res === 'object' && 'data' in res && (res.data?.payload || res.data?.record) ? res.data : res;
      setGstData(data); setGstOrder(ord);
    } catch (err) {
      setGstError(`Failed to load GST QR for ${ord.orderNumber}: ${err.message}`);
    }
  };

  const handleGenerateIrn = async (ord) => {
    setIrnMessage(null); setIrnError(null); setGstError(null); setIrnBusyId(ord._id);
    try {
      const res = await invoiceApi.generateIrn(invoiceIdFor(ord));
      const irn = res?.data?.irn || res?.irn || res?.data?.record?.irn;
      setIrnMessage(`IRN generated for ${ord.orderNumber}${irn ? `: ${irn}` : ''}`);
    } catch (err) {
      if (err.status === 501 || err.data?.code === 'GSP_NOT_CONFIGURED' || err.data?.data?.code === 'GSP_NOT_CONFIGURED') {
        setIrnError('GST provider not configured');
      } else {
        setIrnError(`Failed to generate IRN for ${ord.orderNumber}: ${err.message}`);
      }
    } finally { setIrnBusyId(null); }
  };

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
                          <button
                            type="button"
                            role="menuitem"
                            className="invoice-menu-item"
                            onClick={() => { setOpenMenuId(null); handleViewGstQr(ord); }}
                          >
                            <Eye size={14} />
                            <span>GST QR Payload</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="invoice-menu-item"
                            disabled={irnBusyId === ord._id}
                            onClick={() => { setOpenMenuId(null); handleGenerateIrn(ord); }}
                          >
                            <CircleDollarSign size={14} />
                            <span>{irnBusyId === ord._id ? 'Generating IRN...' : 'Generate IRN'}</span>
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
      {gstError && <div role="alert" style={{ color: 'var(--accent-rose, #fb7185)', marginTop: '0.75rem' }}>{gstError}</div>}
      {irnMessage && <div role="status" style={{ color: 'var(--accent-emerald, #34d399)', marginTop: '0.75rem' }}>{irnMessage}</div>}
      {irnError && <div role="alert" style={{ color: 'var(--accent-rose, #fb7185)', marginTop: '0.75rem' }}>{irnError}</div>}
      {gstData && (
        <Modal isOpen={Boolean(gstData)} onClose={() => { setGstData(null); setGstOrder(null); }} title={`GST QR — ${gstOrder?.orderNumber || ''}`}>
          <div className="form-group">
            <label className="form-label">QR Payload</label>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{typeof gstData.payload === 'string' ? gstData.payload : JSON.stringify(gstData.payload ?? '', null, 2)}</pre>
          </div>
          {gstData.record && (
            <div className="form-group">
              <label className="form-label">Record</label>
              <dl>
                {Object.entries(gstData.record).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '0.5rem' }}><dt style={{ color: 'var(--text-muted)' }}>{k}</dt><dd style={{ margin: 0 }}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
