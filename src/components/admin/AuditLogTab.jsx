import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api/client';
import { actorLabel } from '../../lib/adminConsole';
import './admin-console.css';

// Audit log viewer (v0.9 F1 e): GET /api/admin/audit-logs with action +
// entityType filters; before/after shown in an expandable <details>.
export const AuditLogTab = () => {
  const [entries, setEntries] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [applied, setApplied] = useState({ action: '', entityType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async (filters) => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.getAuditLogs(filters);
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setEntries(data);
    } catch (err) {
      setError(err.message); setEntries([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(applied); }, [fetchLogs, applied]);

  return (
    <div className="glass-card">
      <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Audit Log</h3>
      <div className="admin-console-toolbar">
        <input type="text" placeholder="Filter by action" aria-label="Filter by action" className="form-control" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        <input type="text" placeholder="Filter by entity type" aria-label="Filter by entity type" className="form-control" value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} />
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setApplied({ action: actionFilter, entityType: entityTypeFilter })}>Apply Filters</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setActionFilter(''); setEntityTypeFilter(''); setApplied({ action: '', entityType: '' }); }}>Clear</button>
      </div>
      {loading && <div>Loading audit logs…</div>}
      {error && <div role="alert" style={{ color: 'var(--accent-rose, #fb7185)' }}>{error}</div>}
      {!loading && !error && entries.length === 0 && <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No audit entries found.</div>}
      {!loading && entries.length > 0 && (
        <div className="table-responsive">
          <table className="custom-table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry._id || entry.id || idx}>
                  <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</td>
                  <td>{actorLabel(entry.actor)}</td>
                  <td>{entry.action}</td>
                  <td>{entry.entityType}{entry.entityId ? ` ${entry.entityId}` : ''}</td>
                  <td>
                    <details>
                      <summary>View changes</summary>
                      <pre className="audit-details">{JSON.stringify({ before: entry.before ?? null, after: entry.after ?? null }, null, 2)}</pre>
                      {(entry.ip || entry.requestId) && <div className="audit-details">{entry.ip ? `IP: ${entry.ip} ` : ''}{entry.requestId ? `Request: ${entry.requestId}` : ''}</div>}
                    </details>
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
export default AuditLogTab;
