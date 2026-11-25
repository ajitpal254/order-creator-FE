import React from 'react';

export const CustomersTab = ({ customers }) => (
  <div className="glass-card">
    <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem', marginBottom: '1.25rem' }}>
      Registered Importers & Wholesale Buyers
    </h3>

    <div className="table-responsive">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Business Name</th>
            <th>Country</th>
            <th>Phone / WhatsApp</th>
            <th>Email & Username</th>
            <th>Address</th>
            <th>Joined Date</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c._id}>
              <td><b style={{ color: '#FFFFFF' }}>{c.customerName}</b></td>
              <td>{c.businessName}</td>
              <td>
                <span className="badge badge-slate">{c.country}</span>
              </td>
              <td>{c.phoneNumber}</td>
              <td>
                <div>{c.email}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{c.username}</div>
              </td>
              <td style={{ fontSize: '0.8rem', maxWidth: '200px' }}>{c.address}</td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
