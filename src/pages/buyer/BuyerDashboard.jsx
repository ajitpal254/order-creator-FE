import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BellRing,
  LayoutDashboard,
  Package,
  Repeat,
  ShoppingCart,
} from 'lucide-react';
import { orderApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ListSkeleton } from '../../components/ListSkeleton';
import { BuyerOrderCard } from '../../components/buyer/BuyerOrderCard';
import { AwaitingActionItem } from '../../components/buyer/AwaitingActionItem';
import {
  getActiveOrders,
  getDraftOrders,
  getUnpaidInvoiceOrders,
  isBuyerUser,
  useBuyerOrders,
  useReorderOrder,
} from '../../hooks/useBuyerDashboard';
import { useTranslation } from 'react-i18next';
import './buyer-dashboard.css';

// Buyer dashboard (FE-13): the post-login landing view for buyer-role
// users. Staff roles keep their existing landing — if a staff user
// lands here directly they get a pointer to the admin dashboard
// instead of buyer data (the coordinator wires the /dashboard route
// and the post-login redirect).
//
// Sections:
//  - Active orders: in-flight orders with API totals, click -> /my-orders.
//  - Awaiting your action: Draft orders (continue in the Order Creator)
//    and orders with an unpaid / partially-paid invoice (display-only
//    figures + the existing invoice PDF download). NOTE: the app has no
//    buyer confirm-delivery action anywhere in its UI/state model, so
//    none is invented here.
//  - Order again: clones any past order into a NEW draft via the
//    existing POST /orders API, then navigates to /order-creator.
//  - Document downloads ride on the cards via orderApi.downloadPdf,
//    the unchanged authenticated blob-download flow.
export const BuyerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [downloadingId, setDownloadingId] = useState(null);
  const [reorderError, setReorderError] = useState(null);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useBuyerOrders();

  const reorder = useReorderOrder();

  // Staff users keep their existing landing.
  if (user && !isBuyerUser(user)) {
    return (
      <div className="buyer-dashboard">
        <div className="container">
          <div className="glass-card buyer-dashboard__empty">
            <LayoutDashboard size={54} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3>{t('dashboard.staffTitle')}</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              {t('dashboard.staffText')}
            </p>
            <Link to="/admin" className="btn btn-primary">
              {t('dashboard.goToAdmin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadPdf = async (order) => {
    try {
      setDownloadingId(order._id);
      await orderApi.downloadPdf(order._id, order.orderNumber);
    } catch (err) {
      alert('Error downloading PDF: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOrderAgain = (order) => {
    setReorderError(null);
    reorder.mutate(order, {
      onSuccess: () => navigate('/order-creator'),
      onError: (err) =>
        setReorderError(
          `Could not create a new draft from order ${order.orderNumber}: ${err.message}`
        ),
    });
  };

  const activeOrders = getActiveOrders(orders);
  const draftOrders = getDraftOrders(orders);
  const unpaidInvoices = getUnpaidInvoiceOrders(orders);
  const awaitingCount = draftOrders.length + unpaidInvoices.length;
  // "Order again" is offered on any past order that has items to copy.
  const reorderableOrders = orders.filter((order) => (order.items || []).length > 0);

  return (
    <div className="buyer-dashboard">
      <div className="container">
        {/* Header */}
        <div className="buyer-dashboard__header">
          <div className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>
            <LayoutDashboard size={14} />
            <span>{t('dashboard.badge')}</span>
          </div>
          <h1 className="buyer-dashboard__title">
            {user?.customerName ? t('dashboard.welcomeBack', { name: user.customerName }) : t('dashboard.welcomeBackPlain')}
          </h1>
          <p className="buyer-dashboard__subtitle">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {reorderError && (
          <div className="buyer-dashboard__error-banner" role="alert">
            <AlertCircle size={20} />
            <span>{reorderError}</span>
          </div>
        )}

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : isError ? (
          <div className="glass-card buyer-dashboard__empty">
            <Package size={54} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3>{t('dashboard.loadFailed')}</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              {error?.message || t('dashboard.loadFailedDefault')}
            </p>
            <button type="button" onClick={() => refetch()} className="btn btn-primary">
              {t('common.tryAgain')}
            </button>
          </div>
        ) : (
          <>
            {/* Awaiting your action */}
            <section className="buyer-dashboard__section">
              <h2 className="buyer-dashboard__section-title">
                <BellRing size={20} />
                <span>{t('dashboard.awaitingTitle')}</span>
              </h2>
              {awaitingCount === 0 ? (
                <div className="glass-card buyer-dashboard__empty">
                  <h3>{t('dashboard.nothingTitle')}</h3>
                  <p>{t('dashboard.nothingText')}</p>
                </div>
              ) : (
                <div className="buyer-dashboard__list">
                  {draftOrders.map((order) => (
                    <AwaitingActionItem key={`draft-${order._id}`} kind="draft" order={order} />
                  ))}
                  {unpaidInvoices.map(({ order, invoice }) => (
                    <AwaitingActionItem
                      key={`invoice-${order._id}`}
                      kind="invoice"
                      order={order}
                      invoice={invoice}
                      onDownloadPdf={handleDownloadPdf}
                      downloading={downloadingId === order._id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Active orders */}
            <section className="buyer-dashboard__section">
              <h2 className="buyer-dashboard__section-title">
                <Package size={20} />
                <span>{t('dashboard.activeTitle')}</span>
              </h2>
              {activeOrders.length === 0 ? (
                <div className="glass-card buyer-dashboard__empty">
                  <h3>{t('dashboard.noActiveTitle')}</h3>
                  <p style={{ marginBottom: '1.5rem' }}>
                    {t('dashboard.noActiveText')}
                  </p>
                  <Link to="/order-creator" className="btn btn-primary">
                    <ShoppingCart size={16} />
                    <span>{t('dashboard.createNewOrder')}</span>
                  </Link>
                </div>
              ) : (
                <div className="buyer-dashboard__list">
                  {activeOrders.map((order) => (
                    <BuyerOrderCard
                      key={order._id}
                      order={order}
                      onDownloadPdf={handleDownloadPdf}
                      downloading={downloadingId === order._id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Order again */}
            <section className="buyer-dashboard__section">
              <h2 className="buyer-dashboard__section-title">
                <Repeat size={20} />
                <span>{t('dashboard.orderAgainTitle')}</span>
              </h2>
              {reorderableOrders.length === 0 ? (
                <div className="glass-card buyer-dashboard__empty">
                  <h3>{t('dashboard.noPastTitle')}</h3>
                  <p>{t('dashboard.noPastText')}</p>
                </div>
              ) : (
                <div className="buyer-dashboard__list">
                  {reorderableOrders.map((order) => (
                    <BuyerOrderCard
                      key={`again-${order._id}`}
                      order={order}
                      onOrderAgain={handleOrderAgain}
                      orderingAgain={
                        reorder.isPending && reorder.variables?._id === order._id
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};
