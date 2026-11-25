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
import { CompanyApprovals } from '../../components/buyer/CompanyApprovals';
import {
  getActiveOrders,
  getDraftOrders,
  getUnpaidInvoiceOrders,
  isBuyerUser,
  useBuyerOrders,
  useReorderOrder,
} from '../../hooks/useBuyerDashboard';
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
            <h3>This dashboard is for buyer accounts</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Your account has a staff role, so your orders workspace is the admin dashboard.
            </p>
            <Link to="/admin" className="btn btn-primary">
              Go to Admin Dashboard
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
            <span>BUYER DASHBOARD</span>
          </div>
          <h1 className="buyer-dashboard__title">
            Welcome back{user?.customerName ? `, ${user.customerName}` : ''}
          </h1>
          <p className="buyer-dashboard__subtitle">
            Your active orders, anything waiting on you, and one-click reorders.
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
            <h3>Failed to load your dashboard</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              {error?.message || 'Something went wrong while loading your orders.'}
            </p>
            <button type="button" onClick={() => refetch()} className="btn btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Awaiting your action */}
            <section className="buyer-dashboard__section">
              <h2 className="buyer-dashboard__section-title">
                <BellRing size={20} />
                <span>Awaiting your action</span>
              </h2>
              {awaitingCount === 0 ? (
                <div className="glass-card buyer-dashboard__empty">
                  <h3>Nothing needs your attention</h3>
                  <p>No draft orders and no unpaid invoices right now.</p>
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

            {/* Company approval queue (v0.9 F3): renders only when
                company orders are awaiting this user's approval. */}
            <CompanyApprovals />

            {/* Active orders */}
            <section className="buyer-dashboard__section">
              <h2 className="buyer-dashboard__section-title">
                <Package size={20} />
                <span>Active orders</span>
              </h2>
              {activeOrders.length === 0 ? (
                <div className="glass-card buyer-dashboard__empty">
                  <h3>No active orders</h3>
                  <p style={{ marginBottom: '1.5rem' }}>
                    Orders in production or on their way to you will show up here.
                  </p>
                  <Link to="/order-creator" className="btn btn-primary">
                    <ShoppingCart size={16} />
                    <span>Create New Order</span>
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
                <span>Order again</span>
              </h2>
              {reorderableOrders.length === 0 ? (
                <div className="glass-card buyer-dashboard__empty">
                  <h3>No past orders to reorder</h3>
                  <p>Once you have placed an order, you can clone it here as a new draft.</p>
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
