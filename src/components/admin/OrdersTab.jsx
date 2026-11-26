import React, { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { ShareTrackingButton } from '../tracking/ShareTrackingButton';
import { Search, Edit3, FileDown } from 'lucide-react';

export const OrdersTab = ({ orders, setSelectedOrderForStatus, setNewStatus, handleDownloadPdf, downloadingPdfId }) => {
  const [orderFilter, setOrderFilter] = useState('All');
  const [orderSearch, setOrderSearch] = useState('');

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
                    {/* Public tracking link (v0.6 F2) — renders only
                        for shipped (Dispatched) orders */}
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
