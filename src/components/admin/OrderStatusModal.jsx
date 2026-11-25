import React from 'react';
import { Modal } from '../../components/Modal';
import { QuotePanel } from '../order/QuotePanel';
import { PayPanel } from '../payments/PayPanel';
import { DocumentsPanel } from '../documents/DocumentsPanel';

export const OrderStatusModal = ({ selectedOrderForStatus, setSelectedOrderForStatus, newStatus, setNewStatus, statusNote, setStatusNote, handleUpdateStatus, onOrderUpdated }) => (
  <Modal
    isOpen={Boolean(selectedOrderForStatus)}
    onClose={() => setSelectedOrderForStatus(null)}
    title={`Update Status for Order #${selectedOrderForStatus.orderNumber}`}
  >
    <div className="form-group">
      <label className="form-label">Select Pipeline Status</label>
      <select
        className="form-control form-select"
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
      >
        <option value="Submitted">Submitted (Under Review)</option>
        <option value="Under Review">Under Review (Pricing Check)</option>
        <option value="Confirmed">Confirmed (Proforma Issued)</option>
        <option value="In Production">In Production (Forging/Assembly)</option>
        <option value="Dispatched">Dispatched (Bill of Lading Issued)</option>
        <option value="Completed">Completed (Delivered)</option>
        <option value="Cancelled">Cancelled</option>
      </select>
    </div>

    <div className="form-group">
      <label className="form-label">Internal & Customer Note</label>
      <textarea
        rows={3}
        className="form-control"
        placeholder="e.g. Raw material batch forged; electro-plating scheduled for Friday."
        value={statusNote}
        onChange={(e) => setStatusNote(e.target.value)}
      />
    </div>

    {/* Quote negotiation for quote-type orders (staff counter-offer
        responses); renders nothing for regular orders. */}
    <QuotePanel order={selectedOrderForStatus} onOrderUpdated={onOrderUpdated} />

    {/* Payments (v0.6 F2): staff review — confirm / reject payments in
        'proof_submitted' status. This modal is the order-detail area
        the OrdersTab rows open, so the panel lives here. */}
    <PayPanel order={selectedOrderForStatus} staff />

    {/* Order documents vault (v0.8 F1 — FEAT-08): staff generate /
        upload / delete for this order's export documents. */}
    <DocumentsPanel order={selectedOrderForStatus} staff />

    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
      <button
        type="button"
        onClick={() => setSelectedOrderForStatus(null)}
        className="btn btn-secondary btn-sm"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleUpdateStatus}
        className="btn btn-primary btn-sm"
      >
        Save Status Update
      </button>
    </div>
  </Modal>
);
