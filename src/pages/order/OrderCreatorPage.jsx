import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import confetti from 'canvas-confetti';
import { Wrench, AlertCircle } from 'lucide-react';
import { useOrderConfigurator } from '../../hooks/useOrderConfigurator';
import { ProductConfigurator } from '../../components/order/ProductConfigurator';
import { OrderSheet } from '../../components/order/OrderSheet';
import { OrderSuccessModal } from '../../components/order/OrderSuccessModal';

export const OrderCreatorPage = () => {
  const { user, isAuthenticated } = useAuth();
  const {
    cartItems,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    totals,
    orderMetadata,
    setOrderMetadata,
    submitOrder
  } = useOrder();

  const location = useLocation();
  const navigate = useNavigate();

  const configurator = useOrderConfigurator({ addItem, locationState: location.state });
  const { products, loading } = configurator;

  // UI / Submission state
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

// Submit Completed Order
const handleFinalSubmit = async () => {
  if (!isAuthenticated) {
    navigate('/login', { state: { from: location } });
    return;
  }

  if (cartItems.length === 0) {
    setErrorMessage('Please add at least one line item to your order sheet.');
    return;
  }

  setSubmitting(true);
  setErrorMessage(null);

  try {
    const res = await submitOrder();
    if (res.success && res.order) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
      setOrderSuccessModal(res.order);
    }
  } catch (err) {
    setErrorMessage(err.message || 'Failed to submit order.');
  } finally {
    setSubmitting(false);
  }
};

  if (loading && products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--accent-amber)' }}>
        Loading Order Creator Engine...
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
{/* Page Title */}
<div style={{ marginBottom: '2rem' }}>
  <div className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>
    <Wrench size={14} />
    <span>CUSTOM BATCH ORDER CONFIGURATOR</span>
  </div>
  <h1 style={{ fontSize: '2.4rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>
    Interactive Order Creator
  </h1>
  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
    Select products, customize finish coatings, brand logos, packing cartons, and generate instant proforma invoices.
  </p>
</div>

{errorMessage && (
  <div
    style={{
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      color: '#F87171',
      padding: '1rem',
      borderRadius: 'var(--radius-md)',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}
  >
    <AlertCircle size={20} />
    <span>{errorMessage}</span>
  </div>
)}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* TOP SECTION: Configurator Tool Box */}
          <ProductConfigurator {...configurator} />

          {/* BOTTOM SECTION: Live Order Sheet & Matrix Table */}
          <OrderSheet
            cartItems={cartItems}
            clearCart={clearCart}
            updateItem={updateItem}
            removeItem={removeItem}
            totals={totals}
            orderMetadata={orderMetadata}
            setOrderMetadata={setOrderMetadata}
            isAuthenticated={isAuthenticated}
            user={user}
            submitting={submitting}
            handleFinalSubmit={handleFinalSubmit}
          />
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {orderSuccessModal && (
        <OrderSuccessModal
          orderSuccessModal={orderSuccessModal}
          setOrderSuccessModal={setOrderSuccessModal}
        />
      )}
    </div>
  );
};
