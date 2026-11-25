import React from 'react';

export const AdminStats = ({ stats, orders, products }) => (
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem',
  }}
>
  <div className="glass-card" style={{ padding: '1.25rem' }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Inbound Orders</span>
    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', marginTop: '0.25rem' }}>
      {stats?.totalOrders ?? orders.length}
    </div>
  </div>

  <div className="glass-card" style={{ padding: '1.25rem' }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Review</span>
    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
      {stats?.pendingOrders ?? orders.filter((o) => ['Submitted', 'Under Review'].includes(o.status)).length}
    </div>
  </div>

  <div className="glass-card" style={{ padding: '1.25rem' }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Catalog Products</span>
    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-blue)', marginTop: '0.25rem' }}>
      {products.length}
    </div>
  </div>

  <div className="glass-card" style={{ padding: '1.25rem' }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Pipeline Value</span>
    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10B981', marginTop: '0.25rem' }}>
      ${(stats?.totalRevenue ?? orders.reduce((s, o) => s + (o.totalAmount || 0), 0)).toFixed(2)}
    </div>
  </div>
</div>
);
