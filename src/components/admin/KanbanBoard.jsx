import React, { useMemo, useState } from 'react';
import { orderApi } from '../../api/client';
import { StatusBadge } from '../StatusBadge';
import {
  ORDER_STATUSES, loadSavedFilters, persistSavedFilters, upsertSavedFilter,
  ordersToCsv, downloadCsv, runBulkStatusUpdate,
} from '../../lib/adminConsole';
import './admin-console.css';

// Kanban board (v0.9 F1 a+b+c+d): one column per canonical status,
// click-to-move via a per-card select + Move button (no drag-and-drop
// dependency), bulk status update with per-order results, saved filters
// in localStorage, and client-side CSV export of the filtered list.
export const KanbanBoard = ({ orders = [], setOrders, showToast }) => {
  const [search, setSearch] = useState('');
  const [moveTargets, setMoveTargets] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState('Confirmed');
  const [bulkResult, setBulkResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [savedFilters, setSavedFilters] = useState(() => loadSavedFilters());
  const [filterName, setFilterName] = useState('');
  const [busy, setBusy] = useState(false);

  const notify = (msg) => { if (showToast) showToast(msg); };

  const filtered = useMemo(() => orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNumber?.toLowerCase().includes(q)
      || o.customerDetails?.customerName?.toLowerCase().includes(q)
      || o.customerDetails?.businessName?.toLowerCase().includes(q)
      || o.customerDetails?.country?.toLowerCase().includes(q);
  }), [orders, search]);

  const applyUpdated = (id, status) => {
    if (setOrders) setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
  };

  const handleMove = async (order) => {
    const target = moveTargets[order._id] || order.status;
    if (target === order.status) return;
    setErrorMessage(null);
    try {
      const res = await orderApi.updateOrderStatus(order._id, {
        status: target,
        note: `Status changed to ${target} by Admin`,
      });
      const updatedStatus = res?.data?.status || res?.order?.status || target;
      applyUpdated(order._id, updatedStatus);
      notify(`Order #${order.orderNumber} updated to ${target}`);
    } catch (err) {
      // Keep the card in place on error.
      setErrorMessage(`Failed to move order ${order.orderNumber}: ${err.message}`);
    }
  };

  const toggleSelected = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleBulk = async () => {
    const chosen = filtered.filter((o) => selected.has(o._id));
    if (!chosen.length || busy) return;
    setBusy(true); setBulkResult(null); setErrorMessage(null);
    const result = await runBulkStatusUpdate(chosen, bulkStatus, (id, payload) => orderApi.updateOrderStatus(id, payload));
    result.succeeded.forEach((o) => applyUpdated(o._id, bulkStatus));
    setBulkResult(result);
    setBusy(false);
    notify(`Bulk update: ${result.succeeded.length} succeeded, ${result.failed.length} failed`);
  };

  const handleSaveFilter = () => {
    const name = filterName.trim();
    if (!name) return;
    const next = upsertSavedFilter(savedFilters, { name, search });
    setSavedFilters(next); persistSavedFilters(next); setFilterName('');
  };

  const handleDeleteFilter = (name) => {
    const next = savedFilters.filter((f) => f.name !== name);
    setSavedFilters(next); persistSavedFilters(next);
  };

  const handleExport = () => downloadCsv('orders-export.csv', ordersToCsv(filtered));

  return (
    <div className="glass-card">
      <div className="admin-console-toolbar">
        <input type="text" placeholder="Search orders..." aria-label="Search orders" className="form-control" style={{ flex: '1 1 220px' }} value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>Export CSV</button>
        <input type="text" placeholder="Filter name" aria-label="Saved filter name" className="form-control" style={{ flex: '0 1 160px' }} value={filterName} onChange={(e) => setFilterName(e.target.value)} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleSaveFilter}>Save Filter</button>
        {savedFilters.map((f) => (
          <span key={f.name} style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearch(f.search || '')}>{f.name}</button>
            <button type="button" className="btn btn-secondary btn-sm" aria-label={`Delete saved filter ${f.name}`} onClick={() => handleDeleteFilter(f.name)}>×</button>
          </span>
        ))}
      </div>

      <div className="admin-console-toolbar">
        <span>{selected.size} selected</span>
        <label>
          Bulk status{' '}
          <select aria-label="Bulk target status" className="form-control form-select" style={{ display: 'inline-block', width: 'auto' }} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-primary btn-sm" disabled={!selected.size || busy} onClick={handleBulk}>Apply Bulk Status</button>
      </div>

      {bulkResult && (
        <div className="bulk-results" role="status">
          <div>{bulkResult.succeeded.length} succeeded, {bulkResult.failed.length} failed</div>
          {bulkResult.failed.length > 0 && (
            <ul>{bulkResult.failed.map(({ order, error }) => <li key={order._id}>{order.orderNumber}: {error}</li>)}</ul>
          )}
        </div>
      )}
      {errorMessage && <div role="alert" style={{ color: 'var(--accent-rose, #fb7185)', marginBottom: '0.75rem' }}>{errorMessage}</div>}

      <div className="kanban-board">
        {ORDER_STATUSES.map((status) => {
          const cards = filtered.filter((o) => o.status === status);
          return (
            <section key={status} className="kanban-column" aria-label={`${status} column`}>
              <h4><span>{status}</span><span>{cards.length}</span></h4>
              {cards.map((ord) => (
                <article key={ord._id} className="kanban-card">
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input type="checkbox" aria-label={`Select order ${ord.orderNumber}`} checked={selected.has(ord._id)} onChange={(e) => toggleSelected(ord._id, e.target.checked)} />
                    <span className="kanban-card-title">{ord.orderNumber}</span>
                  </div>
                  <div className="kanban-card-meta">{ord.customerDetails?.customerName || 'N/A'}</div>
                  <div className="kanban-card-meta">{ord.customerDetails?.businessName}</div>
                  <div><StatusBadge status={ord.status} /></div>
                  <div className="kanban-card-total">${typeof ord.totalAmount === 'number' ? ord.totalAmount.toFixed(2) : ord.totalAmount}</div>
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                    <select aria-label={`Move ${ord.orderNumber} to status`} className="form-control form-select" value={moveTargets[ord._id] || ord.status} onChange={(e) => setMoveTargets((p) => ({ ...p, [ord._id]: e.target.value }))}>
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleMove(ord)}>Move</button>
                  </div>
                </article>
              ))}
              {cards.length === 0 && <div className="kanban-card-meta">No orders</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
