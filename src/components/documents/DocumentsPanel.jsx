import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, FileDown, FilePlus2, Trash2, Upload } from 'lucide-react';
import {
  documentIdOf,
  documentKeys,
  documentsApi,
  extractDocuments,
} from '../../api/documents';
import { useAuth } from '../../context/AuthContext';
import './documents.css';

// Order documents vault (v0.8 F1 — FEAT-08). Rendered inside the expanded
// order on the buyer's My Orders page and inside the staff order-status
// modal, next to PayPanel.
//
// The vault holds the order's generated export documents (packing list,
// export commercial invoice, certificate of origin, shipping labels) and
// uploaded files. Every field shown comes from the API — nothing is
// computed here. These documents are unrelated to the invoice components.
//
// Generate permissions: staff always see the Generate menu. Buyers see it
// too, but if the backend refuses a buyer generate call (403/404) the
// menu is hidden for the rest of the session without an alarming error.

export const DOCUMENT_TYPE_LABELS = {
  packing_list: 'Packing List',
  export_commercial_invoice: 'Export Commercial Invoice',
  certificate_of_origin: 'Certificate of Origin',
  shipping_labels: 'Shipping Labels',
};

const SYSTEM_TYPES = Object.keys(DOCUMENT_TYPE_LABELS);
const CUSTOM_GROUP = 'Custom documents';

const groupLabelOf = (doc) => DOCUMENT_TYPE_LABELS[doc?.type] ?? CUSTOM_GROUP;

// generatedFrom values like 'upload' / 'manual' mean a person uploaded
// the file; anything else (system/template/order data) means generated.
const originLabelOf = (doc) =>
  ['upload', 'manual'].includes((doc?.generatedFrom || '').toLowerCase())
    ? 'Uploaded'
    : 'Generated';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

// Groups documents by type, keeping the four system types in contract
// order and everything else under "Custom documents".
const groupDocuments = (docs) => {
  const groups = new Map();
  for (const doc of docs) {
    const label = groupLabelOf(doc);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(doc);
  }
  const ordered = [];
  for (const type of SYSTEM_TYPES) {
    const label = DOCUMENT_TYPE_LABELS[type];
    if (groups.has(label)) {
      ordered.push({ label, docs: groups.get(label) });
      groups.delete(label);
    }
  }
  for (const [label, groupDocs] of groups) ordered.push({ label, docs: groupDocs });
  return ordered;
};

export const DocumentsPanel = ({ order, staff = false }) => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const orderId = order?._id ?? order?.id;

  // Staff mode: explicit prop (admin hosts) or the signed-in user is
  // staff, mirroring PayPanel.
  const isStaff =
    staff || Boolean(isAdmin) || user?.role === 'admin' || user?.role === 'staff';

  const [menuOpen, setMenuOpen] = useState(false);
  const [generateHidden, setGenerateHidden] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // { kind, message }
  const fileInputRef = useRef(null);

  const {
    data: documentsData,
    isLoading: documentsLoading,
    isError: documentsError,
  } = useQuery({
    queryKey: documentKeys.order(orderId),
    queryFn: () => documentsApi.listDocuments(orderId),
    enabled: Boolean(orderId),
  });
  const documents = extractDocuments(documentsData);
  const groups = groupDocuments(documents);

  const refreshDocuments = () =>
    queryClient.invalidateQueries({ queryKey: documentKeys.order(orderId) });

  const generateMutation = useMutation({
    mutationFn: (type) => documentsApi.generateDocument(orderId, type),
    onSuccess: () => {
      setMenuOpen(false);
      refreshDocuments();
    },
    onError: (err) => {
      // A buyer generate refused with 403/404 means generation is a
      // staff-only capability for this account: hide the menu quietly
      // for the rest of the session instead of alarming the buyer.
      if (!isStaff && (err?.status === 403 || err?.status === 404)) {
        setGenerateHidden(true);
        setMenuOpen(false);
        return;
      }
      setActionError(err.message || 'Could not generate document');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => documentsApi.deleteDocument(orderId, docId),
    onSuccess: () => {
      setConfirmDeleteId(null);
      refreshDocuments();
    },
    onError: (err) => setActionError(err.message || 'Could not delete document'),
  });

  const handleGenerate = (type) => {
    setActionError(null);
    generateMutation.mutate(type);
  };

  const handleDownload = async (doc) => {
    setActionError(null);
    try {
      await documentsApi.downloadDocument(orderId, doc);
    } catch (err) {
      setActionError(err.message || 'Failed to download document');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadStatus({ kind: 'error', message: 'Choose a file first.' });
      return;
    }
    setUploadStatus(null);
    setUploadProgress(0);
    try {
      await documentsApi.uploadDocument(
        orderId,
        uploadFile,
        uploadTitle.trim(),
        setUploadProgress
      );
      setUploadStatus({ kind: 'success', message: 'Document uploaded.' });
      setUploadTitle('');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshDocuments();
    } catch (err) {
      setUploadStatus({
        kind: 'error',
        message: err.message || 'Failed to upload document',
      });
    } finally {
      setUploadProgress(null);
    }
  };

  if (!order || !orderId) return null;

  const showGenerate = !generateHidden;

  return (
    <section aria-label="Order documents" className="doc-panel">
      <span className="doc-panel-title">Order Documents</span>

      {/* Generate menu: the four system document types. */}
      {showGenerate ? (
        <div className="doc-generate">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            disabled={generateMutation.isPending}
          >
            <FilePlus2 size={14} />
            <span>Generate</span>
            {menuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {menuOpen && (
            <div className="doc-generate-menu" role="group" aria-label="Generate document">
              {SYSTEM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={generateMutation.isPending}
                  onClick={() => handleGenerate(type)}
                >
                  <span>{`Generate ${DOCUMENT_TYPE_LABELS[type]}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="doc-panel-note">
          Document generation is handled by our export team — generated documents will
          appear here.
        </p>
      )}

      {actionError && (
        <p role="alert" className="doc-panel-error">
          {actionError}
        </p>
      )}

      {/* Documents list, grouped by type */}
      <div className="doc-list">
        {documentsLoading ? (
          <p className="doc-list-empty">Loading documents…</p>
        ) : documentsError ? (
          <p className="doc-list-empty">Could not load documents for this order.</p>
        ) : documents.length === 0 ? (
          <p className="doc-list-empty">
            No documents yet. This vault holds the order&apos;s export documents —
            packing list, commercial invoice and certificates — along with any files
            uploaded for the order.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="doc-group">
              <span className="doc-group-title">{group.label}</span>
              {group.docs.map((doc, idx) => {
                const docId = documentIdOf(doc);
                const confirming = confirmDeleteId != null && confirmDeleteId === docId;
                return (
                  <div key={docId ?? idx} className="doc-row">
                    <div className="doc-row-top">
                      <span className="doc-row-title">{doc.title}</span>
                      {doc.version != null && doc.version !== '' && (
                        <span className="badge badge-slate">{`v${doc.version}`}</span>
                      )}
                      <span className="badge badge-amber">{originLabelOf(doc)}</span>
                      <span className="doc-row-meta">
                        {doc.createdAt ? formatDate(doc.createdAt) : ''}
                      </span>
                    </div>
                    <div className="doc-row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <FileDown size={14} />
                        <span>Download</span>
                      </button>
                      {isStaff && docId && !confirming && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            setActionError(null);
                            setConfirmDeleteId(docId);
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      )}
                      {isStaff && docId && confirming && (
                        <>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(docId)}
                          >
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Upload form */}
      <div className="doc-upload">
        <span className="doc-upload-title">Upload a document</span>
        <div className="doc-upload-row">
          <input
            type="text"
            className="form-control"
            style={{ maxWidth: '240px' }}
            aria-label="Document title"
            placeholder="Document title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            disabled={uploadProgress != null}
          />
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Document file"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            disabled={uploadProgress != null}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleUpload}
            disabled={uploadProgress != null}
          >
            <Upload size={14} />
            <span>{uploadProgress != null ? 'Uploading...' : 'Upload'}</span>
          </button>
        </div>
        {uploadProgress != null && (
          <div
            className="doc-progress"
            role="progressbar"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Document upload progress"
          >
            <div className="doc-progress-bar" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
        {uploadStatus?.kind === 'success' && (
          <p className="doc-panel-success" role="status">
            {uploadStatus.message}
          </p>
        )}
        {uploadStatus?.kind === 'error' && (
          <p className="doc-panel-error" role="alert">
            {uploadStatus.message}
          </p>
        )}
      </div>
    </section>
  );
};
