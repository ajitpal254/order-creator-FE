import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { Modal } from '../Modal';
import { parseBulkImport } from '../../lib/csvImport';

// Bulk-import modal (FE-12): paste CSV rows of
//   "product name or SKU, quantity"
// Rows are parsed and validated client-side against the already-loaded
// catalog (see src/lib/csvImport.js) and the per-row result is shown
// BEFORE anything is applied. Only valid rows are added, and only when
// the user confirms.
export const BulkImportModal = ({ isOpen, onClose, products, onApply }) => {
  const [text, setText] = useState('');

  const { rows, validRows } = useMemo(
    () => parseBulkImport(text, products),
    [text, products]
  );
  const hasInput = text.trim().length > 0;

  const handleApply = () => {
    if (validRows.length === 0) return;
    onApply(validRows);
    setText('');
    onClose();
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import Line Items" maxWidth="640px">
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
        Paste one row per line as <b>product name or SKU, quantity</b> — for example
        {' '}<i>HAO-CS-014, 200</i>. Rows are checked against the catalog before anything
        is added; only valid rows are imported.
      </p>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label" htmlFor="bulk-import-text">CSV rows</label>
        <textarea
          id="bulk-import-text"
          rows={8}
          className="form-control"
          placeholder={'Combination Spanner Set 14pc, 200\nHAO-GG-400, 50'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {hasInput && (
        <div style={{ marginBottom: '1rem' }}>
          {rows.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No rows to import yet.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
              {rows.map((row) => (
                <li
                  key={row.lineNumber}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    color: row.error ? '#F87171' : 'var(--text-secondary)',
                  }}
                >
                  {row.error ? (
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-emerald)' }} />
                  )}
                  <span>
                    Line {row.lineNumber}:{' '}
                    {row.error
                      ? row.error
                      : `${row.product.name} (${row.product.sku}) × ${row.quantity}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button type="button" className="btn btn-secondary" onClick={handleClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={validRows.length === 0}
          onClick={handleApply}
        >
          <Upload size={16} />
          <span>
            {validRows.length > 0
              ? `Import ${validRows.length} valid ${validRows.length === 1 ? 'row' : 'rows'}`
              : 'Import valid rows'}
          </span>
        </button>
      </div>
    </Modal>
  );
};
