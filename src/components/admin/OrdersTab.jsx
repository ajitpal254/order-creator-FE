import React, { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { ShareTrackingButton } from '../tracking/ShareTrackingButton';
import { Search, Edit3, FileDown } from 'lucide-react';
import { orderApi } from '../../api/client';
import {
  ORDER_STATUSES, loadSavedFilters, persistSavedFilters, upsertSavedFilter,
  ordersToCsv, downloadCsv, runBulkStatusUpdate,
} from '../../lib/adminConsole';
import './admin-console.css';

export const OrdersTab = ({ orders, setOrders, setSelectedOrderForStatus, setNewStatus, handleDownloadPdf, downloadingPdfId, showToast }) => {
  const [orderFilter, setOrderFilter] = useState('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState('Confirmed');
  const [bulkResult, setBulkResult] = useState(null);
  const [savedFilters, setSavedFilters] = useState(() => loadSavedFilters());
  const [filterName, setFilterName] = useState('');

const filteredOrders = orders.filter((o) => {
  const matchStatus = orderFilter === 'All' || o.status === orderFilter;
  const matchSearch =
    !orderSearch ||
    o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerDetails?.customerName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerDetails?.businessName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerDetails?.country?.toLowerCase().includes(orderSearch.toLowerCase());
  return matchStatus && matchSearch;
});

  const toggleSelected = (id, checked) => setSelected((prev) => {
    const next = new Set(prev);
    if (checked) next.add(id); else next.delete(id);
    return next;
  });

  const handleBulk = async () => {
    const chosen = filteredOrders.filter((o) => selected.has(o._id));
    if (!chosen.length) return;
    const result = await runBulkStatusUpdate(chosen, bulkStatus, (id, payload) => orderApi.updateOrderStatus(id, payload));
    if (setOrders) {
      const okIds = new Set(result.succeeded.map((o) => o._id));
      setOrders((prev) => prev.map((o) => (okIds.has(o._id) ? { ...o, status: bulkStatus } : o)));
    }
    setBulkResult(result);
    if (showToast) showToast(`Bulk update: ${result.succeeded.length} succeeded, ${result.failed.length} failed`);
  };

  const handleSaveFilter = () => {
    const name = filterName.trim();
    if (!name) return;
    const next = upsertSavedFilter(savedFilters, { name, search: orderSearch, status: orderFilter });
    setSavedFilters(next); persistSavedFilters(next); setFilterName('');
  };
  const handleApplyFilter = (f) => { setOrderSearch(f.search || ''); setOrderFilter(f.status || 'All'); };
  const handleDeleteFilter = (name) => {
    const next = savedFilters.filter((f) => f.name !== name);
    setSavedFilters(next); persistSavedFilters(next);
  };

  return (
  <div className="glass-card">
    {/* Filters */}
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ position: 'relative', flex: '1 1 280px' }}>
        <Search
          size={16}
          color="var(--text-muted)"
          style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Search by Order #, Buyer Name, Business, Country..."
          className="form-control"
          style={{ paddingLeft: '2.5rem' }}
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {['All', 'Submitted', 'Under Review', 'Confirmed', 'In Production', 'Dispatched', 'Completed'].map((st) => (
          <button
            key={st}
            onClick={() => setOrderFilter(st)}
            className={`btn btn-sm ${orderFilter === st ? 'btn-primary' : 'btn-secondary'}`}
          >
            {st}
          </button>
        ))}
      </div>
    </div>

    {/* v0.9 F1: CSV export, saved filters, bulk status update */}
    <div className="admin-console-toolbar">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv('orders-export.csv', ordersToCsv(filteredOrders))}>Export CSV</button>
      <input type="text" placeholder="Filter name" aria-label="Saved filter name" className="form-control" style={{ flex: '0 1 160px' }} value={filterName} onChange={(e) => setFilterName(e.target.value)} />
      <button type="button" className="btn btn-secondary btn-sm" onClick={handleSaveFilter}>Save Filter</button>
      {savedFilters.map((f) => (
        <span key={f.name} style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleApplyFilter(f)}>{f.name}</button>
          <button type="button" className="btn btn-secondary btn-sm" aria-label={`Delete saved filter ${f.name}`} onClick={() => handleDeleteFilter(f.name)}>×</button>
        </span>
      ))}
      <span>{selected.size} selected</span>
      <label>Bulk status{' '}
        <select aria-label="Bulk target status" className="form-control form-select" style={{ display: 'inline-block', width: 'auto' }} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <button type="button" className="btn btn-primary btn-sm" disabled={!selected.size} onClick={handleBulk}>Apply Bulk Status</button>
    </div>
    {bulkResult && (
      <div className="bulk-results" role="status">
        <div>{bulkResult.succeeded.length} succeeded, {bulkResult.failed.length} failed</div>
        {bulkResult.failed.length > 0 && <ul>{bulkResult.failed.map(({ order, error }) => <li key={order._id}>{order.orderNumber}: {error}</li>)}</ul>}
      </div>
    )}

    {/* Orders Table */}
    {filteredOrders.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        No orders match your filter criteria.
      </div>
    ) : (
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th aria-label="Select" />
              <th>Order #</th>
              <th>Date</th>
              <th>Buyer Details</th>
              <th>Items Count</th>
              <th style={{ textAlign: 'right' }}>Weight & Cartons</th>
              <th style={{ textAlign: 'right' }}>Total (USD)</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((ord) => (
              <tr key={ord._id}>
                <td><input type="checkbox" aria-label={`Select order ${ord.orderNumber}`} checked={selected.has(ord._id)} onChange={(e) => toggleSelected(ord._id, e.target.checked)} /></td>
                <td>
                  <b style={{ color: '#FFFFFF' }}>{ord.orderNumber}</b>
                </td>
                <td>
                  {new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#FFFFFF' }}>
                    {ord.customerDetails?.customerName || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {ord.customerDetails?.businessName} ({ord.customerDetails?.country})
                  </div>
                </td>
                <td>{ord.totalQuantity} pcs ({ord.items?.length} types)</td>
                <td style={{ textAlign: 'right' }}>
                  {ord.estimatedWeightKg} kg / ~{ord.estimatedCartons} ctn
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-amber)' }}>
                  ${ord.totalAmount?.toFixed(2)}
                </td>
                <td>
                  <StatusBadge status={ord.status} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => {
                        setSelectedOrderForStatus(ord);
                        setNewStatus(ord.status);
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Update Status"
                    >
                      <Edit3 size={14} />
                      <span>Status</span>
                    </button>
                    <ShareTrackingButton order={ord} />
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(ord._id, ord.orderNumber)}
                      disabled={downloadingPdfId === ord._id}
                      className="btn btn-secondary btn-sm"
                      title="Download PDF"
                    >
                      <FileDown size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
  );
};
