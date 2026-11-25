import React, { useEffect, useState } from 'react';
import { userApi } from '../../api/client';
import { USER_ROLES } from '../../lib/adminConsole';

// Customers tab + role management (v0.9 F1 f): role dropdown per row,
// confirm dialog, PATCH /api/users/:id/role, toast/message on result.
export const CustomersTab = ({ customers = [], setCustomers, showToast }) => {
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [message, setMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => { setLocalCustomers(customers); }, [customers]);

  const rows = setCustomers ? customers : localCustomers;

  const applyRoleLocally = (id, role) => {
    const updater = (prev) => prev.map((c) => (c._id === id ? { ...c, role } : c));
    if (setCustomers) setCustomers(updater); else setLocalCustomers(updater);
  };

  const handleRoleChange = async (customer, newRole) => {
    if (!newRole || newRole === customer.role) return;
    const confirmed = window.confirm(
      `Change role for ${customer.customerName || customer.email || customer._id} from ${customer.role || 'buyer'} to ${newRole}?`
    );
    if (!confirmed) return;
    setMessage(null); setErrorMessage(null);
    try {
      await userApi.updateRole(customer._id, newRole);
      applyRoleLocally(customer._id, newRole);
      const msg = `Role for ${customer.customerName || customer.email} updated to ${newRole}`;
      setMessage(msg);
      if (showToast) showToast(msg);
    } catch (err) {
      setErrorMessage(`Failed to update role: ${err.message}`);
    }
  };

  return (
    <div className="glass-card">
      <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem', marginBottom: '1.25rem' }}>
        Registered Importers & Wholesale Buyers
      </h3>
      {message && <div role="status" style={{ marginBottom: '0.75rem', color: 'var(--accent-emerald, #34d399)' }}>{message}</div>}
      {errorMessage && <div role="alert" style={{ marginBottom: '0.75rem', color: 'var(--accent-rose, #fb7185)' }}>{errorMessage}</div>}

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
              <th>Role</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c._id}>
                <td><b style={{ color: '#FFFFFF' }}>{c.customerName}</b></td>
                <td>{c.businessName}</td>
                <td><span className="badge badge-slate">{c.country}</span></td>
                <td>{c.phoneNumber}</td>
                <td>
                  <div>{c.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{c.username}</div>
                </td>
                <td style={{ fontSize: '0.8rem', maxWidth: '200px' }}>{c.address}</td>
                <td>
                  <select
                    aria-label={`Role for ${c.customerName || c.email}`}
                    className="form-control form-select"
                    value={c.role || 'buyer'}
                    onChange={(e) => handleRoleChange(c, e.target.value)}
                  >
                    {/* Preserve an unknown current role as an option */}
                    {c.role && !USER_ROLES.includes(c.role) && <option value={c.role}>{c.role}</option>}
                    {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
