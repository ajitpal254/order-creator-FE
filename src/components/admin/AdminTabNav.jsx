import React from 'react';
import { Package, Layers, Settings2, Users, Receipt } from 'lucide-react';

export const AdminTabNav = ({ activeTab, setActiveTab, orders, products, customers }) => (
<div
  style={{
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '0.5rem',
    overflowX: 'auto',
  }}
>
  <button
    onClick={() => setActiveTab('orders')}
    className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
  >
    <Package size={16} />
    <span>Orders Management ({orders.length})</span>
  </button>

  <button
    onClick={() => setActiveTab('products')}
    className={`btn btn-sm ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
  >
    <Layers size={16} />
    <span>Products Catalog ({products.length})</span>
  </button>

  <button
    onClick={() => setActiveTab('attributes')}
    className={`btn btn-sm ${activeTab === 'attributes' ? 'btn-primary' : 'btn-secondary'}`}
  >
    <Settings2 size={16} />
    <span>Dynamic Masters (Finishes & Colors)</span>
  </button>

  <button
    onClick={() => setActiveTab('invoices')}
    className={`btn btn-sm ${activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}`}
  >
    <Receipt size={16} />
    <span>Invoices ({orders.length})</span>
  </button>

  <button
    onClick={() => setActiveTab('customers')}
    className={`btn btn-sm ${activeTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
  >
    <Users size={16} />
    <span>Registered Importers ({customers.length})</span>
  </button>
</div>
);
