import React, { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Save, Trash2 } from 'lucide-react';
import { Modal } from '../Modal';
import { orderFromTemplateResponse, templatesApi } from '../../api/templates';

// Order-template controls (FE-12).
//
//  - "Save as template": prompts for a name, then POST /api/templates
//    with the current order draft payload — the exact shape the
//    order-creation API accepts (built by the parent page, the same
//    payload submitOrder sends, plus the name).
//  - "Templates": picker listing GET /api/templates. Choosing one calls
//    POST /api/templates/:id/create-order and hands the resulting order
//    to the parent (onOrderCreated), which loads it into the creator
//    for editing. Templates can also be deleted (DELETE /api/templates/:id).
export const TemplateControls = ({
  canSave,
  buildDraftPayload,
  onOrderCreated,
  onError,
  onNotice,
}) => {
  const [saveOpen, setSaveOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [usingId, setUsingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadTemplates = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await templatesApi.list();
      setTemplates(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (err) {
      onError?.(err.message || 'Failed to load templates.');
    } finally {
      setLoadingList(false);
    }
  }, [onError]);

  useEffect(() => {
    if (pickerOpen) loadTemplates();
  }, [pickerOpen, loadTemplates]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || !canSave) return;
    setSaving(true);
    try {
      await templatesApi.create({ name: trimmed, ...buildDraftPayload() });
      setName('');
      setSaveOpen(false);
      onNotice?.(`Template "${trimmed}" saved.`);
    } catch (err) {
      onError?.(err.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleUse = async (template) => {
    const id = template._id || template.id;
    if (!id) return;
    setUsingId(id);
    try {
      const res = await templatesApi.createOrder(id);
      const order = orderFromTemplateResponse(res);
      setPickerOpen(false);
      onOrderCreated?.(order, template);
    } catch (err) {
      onError?.(err.message || 'Failed to create an order from this template.');
    } finally {
      setUsingId(null);
    }
  };

  const handleDelete = async (template) => {
    const id = template._id || template.id;
    if (!id) return;
    setDeletingId(id);
    try {
      await templatesApi.remove(id);
      setTemplates((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err) {
      onError?.(err.message || 'Failed to delete template.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setPickerOpen(true)}
        >
          <FolderOpen size={14} />
          <span>Templates</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!canSave}
          title={canSave ? 'Save the current order sheet as a template' : 'Add a line item first'}
          onClick={() => setSaveOpen(true)}
        >
          <Save size={14} />
          <span>Save as template</span>
        </button>
      </div>

      {/* Save-as-template prompt */}
      <Modal isOpen={saveOpen} onClose={() => setSaveOpen(false)} title="Save as Template" maxWidth="480px">
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label" htmlFor="template-name">Template name</label>
          <input
            id="template-name"
            type="text"
            className="form-control"
            placeholder="e.g. Apex quarterly spanner order"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setSaveOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || !name.trim()}
            onClick={handleSave}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </Modal>

      {/* Templates picker */}
      <Modal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} title="Order Templates" maxWidth="560px">
        {loadingList ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading templates...</p>
        ) : templates.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No templates saved yet. Build an order sheet and choose “Save as template” to create one.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
            {templates.map((template) => {
              const id = template._id || template.id;
              return (
                <li
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    backgroundColor: '#111827',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{template.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(template.items || []).length}{' '}
                      {(template.items || []).length === 1 ? 'line item' : 'line items'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={usingId === id}
                      onClick={() => handleUse(template)}
                    >
                      <span>{usingId === id ? 'Creating...' : 'Use template'}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete template ${template.name}`}
                      title="Delete template"
                      disabled={deletingId === id}
                      onClick={() => handleDelete(template)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
};
