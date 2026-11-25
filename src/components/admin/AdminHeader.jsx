import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const AdminHeader = () => (
<div style={{ marginBottom: '2rem' }}>
  <div className="badge badge-rose" style={{ marginBottom: '0.5rem' }}>
    <ShieldCheck size={14} />
    <span>H.A. OVERSEAS EXECUTIVE CONTROL DESK</span>
  </div>
  <h1 style={{ fontSize: '2.4rem', color: '#FFFFFF', marginBottom: '0.25rem' }}>
    Factory Administration Center
  </h1>
  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
    Manage wholesale orders, update dynamic finishes & colorways, configure products, and inspect buyer registrations.
  </p>
</div>
);
