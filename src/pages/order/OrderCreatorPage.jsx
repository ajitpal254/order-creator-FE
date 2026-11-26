import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import confetti from 'canvas-confetti';
import { Wrench, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { useOrderConfigurator } from '../../hooks/useOrderConfigurator';
import { ProductConfigurator } from '../../components/order/ProductConfigurator';
import { OrderSheet } from '../../components/order/OrderSheet';
import { OrderSuccessModal } from '../../components/order/OrderSuccessModal';
import { BulkImportModal } from '../../components/order/BulkImportModal';
import { TemplateControls } from '../../components/order/TemplateControls';
import { CompanySelector } from '../../components/order/CompanySelector';
import { useTranslation } from 'react-i18next';

export const OrderCreatorPage = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const {
    cartItems,
    addItem,
    updateItem,
    removeItem,
    duplicateItem,
    replaceItems,
    clearCart,
    totals,
    orderMetadata,
    setOrderMetadata,
    submitOrder
  } = useOrder();

  const location = useLocation();
  const navigate = useNavigate();

  const configurator = useOrderConfigurator({ addItem, locationState: location.state });
  const { products, attributes, loading } = configurator;

  // UI / Submission state
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [noticeMessage, setNoticeMessage] = useState(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const handleToolsError = useCallback((message) => {
    setErrorMessage(message);
  }, []);

  const handleToolsNotice = useCallback((message) => {
    setErrorMessage(null);
    setNoticeMessage(message);
  }, []);

  // The order-draft payload, in exactly the shape OrderContext
  // .submitOrder sends to POST /orders (FE-12 templates save reuses it).
  const buildDraftPayload = useCallback(
    () => ({
      items: cartItems,
      shippingMarks: orderMetadata.shippingMarks,
      specialInstructions: orderMetadata.specialInstructions,
      customerDetailsOverride: orderMetadata.customerOverride,
    }),
    [cartItems, orderMetadata]
  );

  // Bulk import (FE-12): build a line item for each validated row from
  // the matched catalog product's own fields, mirroring
  // useOrderConfigurator.handleAddLineItem / applyProductDefaults.
  const handleBulkApply = (validRows) => {
    validRows.forEach(({ product, quantity }) => {
      addItem({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        size: product.allowedSizes?.[0] || attributes.sizes?.[0]?.label || 'Standard',
        finish: product.allowedFinishes?.[0] || attributes.finishes?.[0]?.name || 'Chrome Plated',
        color: product.allowedColors?.[0] || attributes.colors?.[0]?.name || 'Industrial Red',
        brand: product.allowedBrands?.[0] || attributes.brands?.[0]?.name || 'H.A. Overseas',
        packaging: 'Master Carton (Standard Export)',
        customMarking: '',
        quantity,
        unitPrice: product.basePrice || 0,
        weightKg: product.weightKg || 1.0,
        pcsPerCarton: product.pcsPerCarton || 20,
      });
    });
    setNoticeMessage(
      `Bulk import complete: ${validRows.length} ${validRows.length === 1 ? 'row' : 'rows'} added to the order sheet.`
    );
  };

  // Templates (FE-12): an order created from a template is loaded into
  // the creator's order sheet for editing when the create-order
  // response carries its items. The creator has no other order-loading
  // mechanism, so when the response carries no items we fall back to
  // My Orders, where the created order can be reviewed.
  const handleTemplateOrderCreated = (order, template) => {
    if (order && Array.isArray(order.items) && order.items.length > 0) {
      replaceItems(order.items);
      setOrderMetadata({
        shippingMarks: order.shippingMarks ?? orderMetadata.shippingMarks,
        specialInstructions:
          order.specialInstructions ?? orderMetadata.specialInstructions,
        customerOverride: orderMetadata.customerOverride,
      });
      setErrorMessage(null);
      setNoticeMessage(
        `Template "${template?.name || 'template'}" applied: the created order is loaded below for editing.`
      );
    } else {
      navigate('/my-orders');
    }
  };

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
        {t('orderCreator.loading')}
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
    <span>{t('orderCreator.badge')}</span>
  </div>
  <h1 style={{ fontSize: '2.4rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>
    {t('orderCreator.title')}
  </h1>
  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
    {t('orderCreator.subtitle')}
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

{noticeMessage && (
  <div
    role="status"
    style={{
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      color: '#34D399',
      padding: '1rem',
      borderRadius: 'var(--radius-md)',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}
  >
    <CheckCircle2 size={20} />
    <span>{noticeMessage}</span>
  </div>
)}

        {/* FE-12 tools: bulk import + order templates */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setBulkImportOpen(true)}
          >
            <Upload size={14} />
            <span>{t('orderCreator.bulkImport')}</span>
          </button>
          <TemplateControls
            canSave={cartItems.length > 0}
            buildDraftPayload={buildDraftPayload}
            onOrderCreated={handleTemplateOrderCreated}
            onError={handleToolsError}
            onNotice={handleToolsNotice}
          />
        </div>

        {/* Company selector (v0.9 F3): renders only when the buyer
            belongs to at least one company. */}
        <CompanySelector
          value={orderMetadata.companyId || ''}
          onChange={(companyId) => setOrderMetadata({ ...orderMetadata, companyId })}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* TOP SECTION: Configurator Tool Box */}
          <ProductConfigurator {...configurator} />

          {/* BOTTOM SECTION: Live Order Sheet & Matrix Table */}
          <OrderSheet
            cartItems={cartItems}
            clearCart={clearCart}
            updateItem={updateItem}
            removeItem={removeItem}
            duplicateItem={duplicateItem}
            products={products}
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

      {/* Bulk Import Modal (FE-12) */}
      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        products={products}
        onApply={handleBulkApply}
      />

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
