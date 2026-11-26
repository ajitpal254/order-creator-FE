import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../api/client';
import { buyerOrdersApi } from '../../api/buyerOrders';
import { orderKeys, useMyOrders } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { ApprovalStatusChip } from '../../components/buyer/ApprovalStatusChip';
import { QuotePanel } from '../../components/order/QuotePanel';
import { InvoicePreview } from '../../components/invoice/InvoicePreview';
import { PayPanel } from '../../components/payments/PayPanel';
import { DocumentsPanel } from '../../components/documents/DocumentsPanel';
import { ShareTrackingButton } from '../../components/tracking/ShareTrackingButton';
import { ListSkeleton } from '../../components/ListSkeleton';
import { FxRateLine } from '../../components/order/FxRateLine';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../i18n/format.js';
import {
  Package,
  FileDown,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Clock,
  Boxes,
  Weight,
  ArrowRight,
  Truck,
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const bannerBaseStyle = {
  padding: '1rem',
  borderRadius: 'var(--radius-md)',
  marginBottom: '1.5rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontSize: '0.9rem',
};

export const MyOrdersPage = () => {
  const { t } = useTranslation();
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  // FE-10: on narrow screens the expanded detail collapses into
  // Details | Invoice tabs; on desktop both panes show side by side.
  const [detailTab, setDetailTab] = useState('details');
  const [downloadingId, setDownloadingId] = useState(null);
  const [reorderError, setReorderError] = useState(null);
  const [reorderMessage, setReorderMessage] = useState(null);

  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // After a reorder, the page lands back here with ?highlight=<new id>
  // and the new draft's card is highlighted (see below).
  const highlightId = searchParams.get('highlight');

  // Read fetching via TanStack Query (FE-07); the api client is unchanged
  // and invoice totals still come straight from this API response.
  const {
    data: baseOrders = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useMyOrders();

  // The default list excludes Draft orders (the backend drops them
  // unless ?includeDrafts=true), so a freshly reordered draft would be
  // invisible here. Only while a highlight target is in the URL do we
  // also fetch the drafts-included list and merge it in — normal visits
  // to My Orders behave exactly as before.
  const { data: ordersWithDrafts } = useQuery({
    queryKey: ['orders', 'my', 'with-drafts'],
    queryFn: async () => {
      const res = await buyerOrdersApi.getMyOrdersIncludingDrafts();
      return res?.success ? res.data : [];
    },
    enabled: Boolean(highlightId),
  });

  const orders = useMemo(() => {
    if (!highlightId || !ordersWithDrafts) return baseOrders;
    const seen = new Set(baseOrders.map((o) => o._id));
    return [...baseOrders, ...ordersWithDrafts.filter((o) => !seen.has(o._id))];
  }, [baseOrders, ordersWithDrafts, highlightId]);

  // Reorder (v0.5 F3): POST /api/orders/:id/reorder creates a NEW Draft
  // order server-side. On success we land back on My Orders (this page)
  // with the new draft highlighted via the ?highlight= query param.
  const reorderMutation = useMutation({
    mutationFn: (order) => buyerOrdersApi.reorderOrder(order._id),
    onSuccess: (res, order) => {
      const newOrder = res?.order || res?.data || (res?._id ? res : null);
      setReorderError(null);
      setReorderMessage(
        newOrder?.orderNumber
          ? `New draft ${newOrder.orderNumber} created from ${order.orderNumber} — it is highlighted below.`
          : `New draft created from ${order.orderNumber} — it is highlighted below.`
      );
      if (newOrder?._id) {
        setSearchParams({ highlight: newOrder._id }, { replace: true });
      }
      queryClient.invalidateQueries({ queryKey: orderKeys.my });
      queryClient.invalidateQueries({ queryKey: ['orders', 'my', 'with-drafts'] });
    },
    onError: (err, order) => {
      setReorderMessage(null);
      setReorderError(
        `Could not reorder ${order.orderNumber}: ${err.message || 'Something went wrong.'}`
      );
    },
  });

  const handleReorder = (e, order) => {
    e.stopPropagation();
    setReorderError(null);
    setReorderMessage(null);
    reorderMutation.mutate(order);
  };

  const handleDownloadPdf = async (e, order) => {
    e.stopPropagation();
    try {
      setDownloadingId(order._id);
      await orderApi.downloadPdf(order._id, order.orderNumber);
    } catch (err) {
      alert('Error downloading PDF: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleExpand = (orderId) => {
    setDetailTab('details');
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>
              <Package size={14} />
              <span>{t('myOrders.badge')}</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', color: '#FFFFFF' }}>{t('myOrders.title')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {t('myOrders.subtitle')}
            </p>
          </div>

          <Link to="/order-creator" className="btn btn-primary">
            <ShoppingCart size={16} />
            <span>{t('myOrders.createNewOrder')}</span>
          </Link>
        </div>

        {reorderError && (
          <div
            role="alert"
            style={{
              ...bannerBaseStyle,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#F87171',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{reorderError}</span>
          </div>
        )}
        {reorderMessage && (
          <div
            style={{
              ...bannerBaseStyle,
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              color: '#4ADE80',
            }}
          >
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <span>{reorderMessage}</span>
          </div>
        )}

        {loading ? (
          <ListSkeleton rows={3} />
        ) : isError ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <Package size={54} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>{t('myOrders.loadFailed')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {error?.message || t('myOrders.loadFailedDefault')}
            </p>
            <button type="button" onClick={() => refetch()} className="btn btn-primary">
              {t('common.tryAgain')}
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <Package size={54} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>{t('myOrders.noOrders')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {t('myOrders.noOrdersHint')}
            </p>
            <Link to="/order-creator" className="btn btn-primary">
              {t('myOrders.launchOrderCreator')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order._id;
              const isHighlighted = Boolean(highlightId) && order._id === highlightId;

              return (
                <div
                  key={order._id}
                  data-highlighted={isHighlighted ? 'true' : undefined}
                  className={isHighlighted ? 'glass-card highlight' : 'glass-card'}
                  style={{
                    padding: '1.5rem',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {/* Order Summary Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleExpand(order._id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          backgroundColor: '#111827',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Package size={20} color="var(--accent-amber)" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} />
                          <ApprovalStatusChip order={order} />
                          {isHighlighted && (
                            <span className="badge badge-amber">{t('myOrders.newDraft')}</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {t('myOrders.placedOn', { date: formatDate(order.createdAt) })}
                        </span>
                        {order.estimatedShipDate && (
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {t('myOrders.estimatedShipDate', { date: formatDate(order.estimatedShipDate) })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Quantity:</span>
                        <b style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>{order.totalQuantity} pcs</b>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Order Value (FOB):</span>
                        <b style={{ color: 'var(--accent-amber)', fontSize: '1.1rem' }}>${order.totalAmount?.toFixed(2)} USD</b>
                        <FxRateLine order={order} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {order.status !== 'Draft' && (
                          <button
                            type="button"
                            onClick={(e) => handleReorder(e, order)}
                            disabled={
                              reorderMutation.isPending &&
                              reorderMutation.variables?._id === order._id
                            }
                            className="btn btn-secondary btn-sm"
                            title="Reorder as a new draft"
                          >
                            <RotateCcw size={16} />
                            <span>
                              {reorderMutation.isPending &&
                              reorderMutation.variables?._id === order._id
                                ? 'Reordering...'
                                : 'Reorder'}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDownloadPdf(e, order)}
                          disabled={downloadingId === order._id}
                          className="btn btn-secondary btn-sm"
                          title="Download PDF"
                        >
                          <FileDown size={16} />
                          <span>{downloadingId === order._id ? 'Downloading...' : 'PDF'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.4rem' }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items & Tracking Timeline */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '1.5rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* FE-10 mobile pane switcher — CSS only shows this
                          at <=900px, where the split below collapses to
                          one pane at a time. */}
                      <div className="order-detail-tabs" role="tablist" aria-label="Order detail views">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={detailTab === 'details'}
                          onClick={() => setDetailTab('details')}
                          className={`btn btn-sm ${detailTab === 'details' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={detailTab === 'invoice'}
                          onClick={() => setDetailTab('invoice')}
                          className={`btn btn-sm ${detailTab === 'invoice' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          Invoice
                        </button>
                      </div>

                      {/* FE-10 split pane: LEFT keeps the existing detail
                          content (timeline, items, quote panel, shipping
                          marks — and room for future panels); RIGHT is
                          the sticky paper invoice preview. */}
                      <div className="order-detail-split">
                      <div
                        className={`order-detail-pane order-detail-left ${detailTab === 'details' ? 'is-mobile-active' : ''}`}
                      >
                      {/* Timeline status bar */}
                      <div
                        style={{
                          backgroundColor: '#111827',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          marginBottom: '1.25rem',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                          Export Processing Timeline
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {(order.timeline || []).map((tl, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                              <Clock size={14} color="var(--accent-blue)" />
                              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{tl.status}</span>
                              <span style={{ color: 'var(--text-muted)' }}>— {tl.note}</span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                {new Date(tl.updatedAt).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="table-responsive">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Item & SKU</th>
                              <th>Size</th>
                              <th>Finish & Color</th>
                              <th>Brand / Marking</th>
                              <th>Packaging</th>
                              <th style={{ textAlign: 'right' }}>Qty</th>
                              <th style={{ textAlign: 'right' }}>Price</th>
                              <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items?.map((item, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>
                                  <b style={{ color: '#FFFFFF' }}>{item.productName}</b>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber-light)' }}>
                                    {item.sku}
                                  </div>
                                </td>
                                <td>{item.size}</td>
                                <td>{item.finish} / {item.color}</td>
                                <td>
                                  {item.brand}
                                  {item.customMarking && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)' }}>
                                      {item.customMarking}
                                    </div>
                                  )}
                                </td>
                                <td>{item.packaging}</td>
                                <td style={{ textAlign: 'right' }}>{item.quantity} pcs</td>
                                <td style={{ textAlign: 'right' }}>${item.unitPrice?.toFixed(2)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-amber)' }}>
                                  ${item.totalPrice?.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Quote negotiation (quote-type orders only; the
                          panel renders nothing for regular orders) */}
                      <QuotePanel order={order} />

                      {/* Payments (v0.6 F2) + public tracking link for
                          shipped orders (the button renders nothing
                          until the order is Dispatched) */}
                      <div style={{ marginTop: '1rem' }}>
                        <ShareTrackingButton order={order} />
                      </div>
                      <PayPanel order={order} />

                      {/* Order documents vault (v0.8 F1 — FEAT-08) */}
                      <DocumentsPanel order={order} />

                      {/* Shipping Marks box */}
                      {order.shippingMarks && (
                        <div
                          style={{
                            marginTop: '1rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: '#111827',
                            border: '1px dashed var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>Master Carton Marks: </span>
                          <span style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{order.shippingMarks}</span>
                        </div>
                      )}
                      </div>{/* /order-detail-left */}

                      <aside
                        className={`order-detail-pane order-detail-right ${detailTab === 'invoice' ? 'is-mobile-active' : ''}`}
                      >
                        <InvoicePreview order={order} />
                      </aside>
                      </div>{/* /order-detail-split */}

                      {/* Sticky totals bar — totalAmount exactly as returned */}
                      <div className="order-totals-bar">
                        <span className="order-totals-bar-label">Order Total (FOB)</span>
                        <span className="order-totals-bar-value">${order.totalAmount?.toFixed(2)} USD</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
