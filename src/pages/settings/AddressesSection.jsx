import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  ADDRESS_TYPES,
  addressTypeLabel,
  emptyAddress,
  formatAddress,
  pickAddressFields,
} from '../../api/addresses';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
} from '../../hooks/useAddresses';

// Saved addresses manager (v0.5 F3): list / add / edit / delete the
// signed-in user's bill-to and ship-to addresses. Lives in Settings
// alongside the 2FA and notifications sections and follows their
// glass-card + banner pattern. Data goes through TanStack Query
// (src/hooks/useAddresses.js) on top of src/api/addresses.js.

const errorBannerStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  color: '#F87171',
  padding: '0.85rem',
  borderRadius: 'var(--radius-md)',
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontSize: '0.85rem',
};

const successBannerStyle = {
  ...errorBannerStyle,
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  border: '1px solid rgba(34, 197, 94, 0.35)',
  color: '#4ADE80',
};

const FORM_FIELDS = [
  { key: 'line1', label: 'Address line 1', required: true },
  { key: 'line2', label: 'Address line 2' },
  { key: 'city', label: 'City', required: true },
  { key: 'state', label: 'State / Province' },
  { key: 'country', label: 'Country', required: true },
  { key: 'postalCode', label: 'Postal code' },
];

export const AddressesSection = () => {
  const { data: addresses = [], isLoading, isError, error, refetch } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  // formMode: null (closed) | 'add' | 'edit'
  const [formMode, setFormMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAddress());
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);

  const busy = createAddress.isPending || updateAddress.isPending;

  const openAdd = () => {
    setForm(emptyAddress());
    setEditingId(null);
    setFormMode('add');
    setFormError(null);
    setMessage(null);
  };

  const openEdit = (address) => {
    setForm({ ...pickAddressFields(address), type: address.type || 'bill-to' });
    setEditingId(address._id || address.id);
    setFormMode('edit');
    setFormError(null);
    setMessage(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setForm(emptyAddress());
    setFormError(null);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    setMessage(null);
    const payload = {
      label: form.label.trim(),
      type: form.type,
      line1: form.line1.trim(),
      line2: form.line2.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      postalCode: form.postalCode.trim(),
    };
    const onSuccess = () => {
      setMessage(formMode === 'edit' ? 'Address updated.' : 'Address saved.');
      closeForm();
    };
    const onError = (err) =>
      setFormError(err.message || 'Could not save the address.');
    if (formMode === 'edit' && editingId) {
      updateAddress.mutate({ id: editingId, address: payload }, { onSuccess, onError });
    } else {
      createAddress.mutate(payload, { onSuccess, onError });
    }
  };

  const handleDelete = (address) => {
    setMessage(null);
    setFormError(null);
    deleteAddress.mutate(address._id || address.id, {
      onSuccess: () => setMessage('Address deleted.'),
      onError: (err) => setFormError(err.message || 'Could not delete the address.'),
    });
  };

  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
      <h3
        style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <MapPin size={18} />
        Addresses
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Save bill-to and ship-to addresses to reuse when you place an order.
      </p>

      {formError && (
        <div style={errorBannerStyle} role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}
      {message && (
        <div style={successBannerStyle}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{message}</span>
        </div>
      )}

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading addresses…</p>
      ) : isError ? (
        <div>
          <p style={{ color: '#F87171', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {error?.message || 'Failed to load addresses.'}
          </p>
          <button type="button" onClick={() => refetch()} className="btn btn-secondary btn-sm">
            Try Again
          </button>
        </div>
      ) : addresses.length === 0 && !formMode ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          No saved addresses yet.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {addresses.map((address) => {
            const id = address._id || address.id;
            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  backgroundColor: '#111827',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      marginBottom: '0.25rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <b style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>{address.label}</b>
                    <span className={address.type === 'ship-to' ? 'badge badge-blue' : 'badge badge-amber'}>
                      {addressTypeLabel(address.type)}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {formatAddress(address)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => openEdit(address)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Pencil size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(address)}
                    disabled={deleteAddress.isPending}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formMode ? (
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="address-label">
                Label *
              </label>
              <input
                id="address-label"
                type="text"
                className="form-control"
                placeholder="e.g. Head office"
                value={form.label}
                onChange={(e) => setField('label', e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="address-type">
                Type *
              </label>
              <select
                id="address-type"
                className="form-control"
                value={form.type}
                onChange={(e) => setField('type', e.target.value)}
              >
                {ADDRESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {FORM_FIELDS.map((field) => (
              <div className="form-group" key={field.key} style={{ margin: 0 }}>
                <label className="form-label" htmlFor={`address-${field.key}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                <input
                  id={`address-${field.key}`}
                  type="text"
                  className="form-control"
                  value={form[field.key]}
                  onChange={(e) => setField(field.key, e.target.value)}
                  required={Boolean(field.required)}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? 'Saving...' : formMode === 'edit' ? 'Save changes' : 'Add address'}
            </button>
            <button type="button" onClick={closeForm} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={openAdd}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          <span>Add address</span>
        </button>
      )}
    </div>
  );
};

export default AddressesSection;
