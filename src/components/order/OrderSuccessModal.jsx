import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../api/client';
import { CheckCircle2, FileDown } from 'lucide-react';
import { Modal } from '../../components/Modal';

// Post-submit confirmation modal. The PDF download below is the original
// OrderCreatorPage flow moved verbatim (FE-04): orderApi.downloadPdf with
// the same arguments, error alert and finally-state handling.
export const OrderSuccessModal = ({ orderSuccessModal, setOrderSuccessModal }) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!orderSuccessModal) return null;

  return (
  <Modal
    isOpen={Boolean(orderSuccessModal)}
    onClose={() => setOrderSuccessModal(null)}
    title="Order Submitted Successfully!"
    maxWidth="640px"
  >
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <CheckCircle2 size={56} color="#10B981" style={{ margin: '0 auto 1rem' }} />
      <h3 style={{ color: '#FFFFFF', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
        Order Reference #{orderSuccessModal.orderNumber}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Thank you, <b>{orderSuccessModal.customerDetails?.customerName}</b>. Your customized tooling order has been officially logged with the H.A. Overseas production & export desk.
      </p>

      <div
        style={{
          backgroundColor: '#111827',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          textAlign: 'left',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Buyer Business:</span>
          <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{orderSuccessModal.customerDetails?.businessName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Configured Units:</span>
          <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{orderSuccessModal.totalQuantity} pcs</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Estimated Gross Weight:</span>
          <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{orderSuccessModal.estimatedWeightKg} kg</span>
        </div>
        {orderSuccessModal.estimatedShipDate && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Estimated ship date:</span>
            <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
              {new Date(orderSuccessModal.estimatedShipDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Proforma Total Value (FOB):</span>
          <span style={{ color: 'var(--accent-amber)', fontWeight: 800, fontSize: '1rem' }}>
            ${orderSuccessModal.totalAmount?.toFixed(2)} USD
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={async () => {
            try {
              setDownloadingPdf(true);
              await orderApi.downloadPdf(orderSuccessModal._id, orderSuccessModal.orderNumber);
            } catch (err) {
              alert('Error downloading PDF: ' + err.message);
            } finally {
              setDownloadingPdf(false);
            }
          }}
          disabled={downloadingPdf}
          className="btn btn-primary"
        >
          <FileDown size={18} />
          <span>{downloadingPdf ? 'Generating PDF...' : 'Download Purchase Order PDF'}</span>
        </button>
        <Link to="/my-orders" className="btn btn-secondary">
          View My Orders
        </Link>
      </div>
    </div>
  </Modal>
  );
};
