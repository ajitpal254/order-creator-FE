import React, { useEffect, useState } from 'react';
import { addressesApi, addressTypeLabel } from '../../api/addresses';

// "Use a saved address" picker for the order form (v0.5 F3).
//
// Loads the signed-in user's saved addresses and offers the ones matching
// `type` ('bill-to' | 'ship-to') in a select; choosing one calls
// onSelect(address) so the parent can fill the order form's existing
// address fields. Data loads with a plain effect through the shared API
// client — the same pattern useOrderConfigurator uses for master data on
// this page — so the picker needs no extra providers. A failed load
// (e.g. a signed-out visitor) renders nothing and the form stays usable.
export const SavedAddressPicker = ({ type, onSelect }) => {
  const [addresses, setAddresses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await addressesApi.list();
        const all = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.addresses)
              ? res.addresses
              : [];
        if (!cancelled) {
          setAddresses(all.filter((a) => a.type === type));
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type]);

  if (failed) return null;

  const selectId = `saved-address-${type}`;
  const typeLabel = addressTypeLabel(type);

  if (loaded && addresses.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
        No saved {typeLabel} addresses yet — you can save addresses in Settings.
      </p>
    );
  }

  return (
    <div className="form-group" style={{ margin: '0 0 0.75rem' }}>
      <label className="form-label" htmlFor={selectId}>
        Use a saved {typeLabel} address
      </label>
      <select
        id={selectId}
        className="form-control"
        value={selectedId}
        disabled={!loaded}
        onChange={(e) => {
          const id = e.target.value;
          setSelectedId(id);
          const chosen = addresses.find((a) => (a._id || a.id) === id);
          if (chosen) onSelect(chosen);
        }}
      >
        <option value="">{loaded ? 'Select a saved address…' : 'Loading saved addresses…'}</option>
        {addresses.map((a) => (
          <option key={a._id || a.id} value={a._id || a.id}>
            {a.label} — {[a.city, a.country].filter(Boolean).join(', ')}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SavedAddressPicker;
