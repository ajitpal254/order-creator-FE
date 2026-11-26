import React, { useEffect, useState } from 'react';
import { companiesApi, getCompanyId, getCompanyName, normalizeMyCompanies } from '../../api/companies';

// Optional company picker for the order creator (v0.9 F3).
//
// Loads the buyer's companies with a plain effect through the shared API
// client — the SavedAddressPicker pattern — so this page needs no extra
// providers. Renders NOTHING when the buyer belongs to no company (or
// the load fails, e.g. a signed-out visitor): the order flow is exactly
// as before for buyers without a company. Choosing a company calls
// onChange(companyId) and the id rides along as `companyId` on submit;
// the empty option clears it.
export const CompanySelector = ({ value = '', onChange }) => {
  const [companies, setCompanies] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = normalizeMyCompanies(await companiesApi.getMine());
        if (!cancelled) {
          setCompanies(entries);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !loaded || companies.length === 0) return null;

  return (
    <div
      className="glass-card"
      style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}
    >
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" htmlFor="order-company">
          Order for a company (optional)
        </label>
        <select
          id="order-company"
          className="form-control"
          value={value}
          disabled={!loaded}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <option value="">
            {loaded ? 'No company — personal order' : 'Loading companies…'}
          </option>
          {companies.map((entry) => {
            const id = getCompanyId(entry.company);
            return (
              <option key={id} value={id}>
                {getCompanyName(entry.company)}
                {entry.role ? ` (${entry.role})` : ''}
              </option>
            );
          })}
        </select>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Company orders may need approval from a company approver before production.
        </p>
      </div>
    </div>
  );
};

export default CompanySelector;
