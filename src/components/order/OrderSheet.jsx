import React from 'react';
import { ShoppingCart, Trash2, Copy, Package, Weight, Boxes, Sparkles } from 'lucide-react';
import { PriceBreakdown } from './PriceBreakdown';

export const OrderSheet = ({ cartItems, clearCart, updateItem, removeItem, duplicateItem, products = [], totals, orderMetadata, setOrderMetadata, isAuthenticated, user, submitting, handleFinalSubmit }) => (
  <div className="glass-card" style={{ padding: '1.75rem' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <h2 style={{ fontSize: '1.3rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            backgroundColor: 'var(--accent-blue)',
            color: '#090D16',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 800,
          }}
        >
          2
        </span>
        Active Order Sheet ({cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'})
      </h2>

      {cartItems.length > 0 && (
        <button
          type="button"
          onClick={clearCart}
          className="btn btn-danger btn-sm"
        >
          <Trash2 size={14} />
          <span>Clear Sheet</span>
        </button>
      )}
    </div>

    {cartItems.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
        <ShoppingCart size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
        <h4 style={{ color: '#FFFFFF', marginBottom: '0.4rem' }}>Your order matrix is empty</h4>
        <p style={{ fontSize: '0.85rem' }}>
          Use the configurator above to add tools, sizes, finishes, and quantities to this order sheet.
        </p>
      </div>
    ) : (
      <>
        <div className="table-responsive" style={{ marginBottom: '1.5rem' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item & SKU</th>
                <th>Size</th>
                <th>Finish / Color</th>
                <th>Brand & Marking</th>
                <th>Packaging</th>
                <th style={{ textAlign: 'right' }}>Qty (pcs)</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Total (USD)</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <b style={{ color: '#FFFFFF', display: 'block' }}>{item.productName}</b>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber-light)' }}>
                      SKU: {item.sku}
                    </span>
                    {/* MOQ hint (FE-12): shown only when the catalog
                        product for this line actually carries an moq.
                        (No lead-time field exists on catalog products,
                        so no lead-time hint is rendered.) */}
                    {(() => {
                      const product = products.find((p) => p._id === item.product);
                      return product?.moq ? (
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          MOQ: {product.moq} pcs
                        </span>
                      ) : null;
                    })()}
                  </td>
                  <td>
                    <span className="badge badge-slate">{item.size}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem' }}>{item.finish}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.color}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.brand}</div>
                    {item.customMarking && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontStyle: 'italic' }}>
                        Note: {item.customMarking}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem' }}>{item.packaging}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      min={1}
                      style={{
                        width: '70px',
                        background: '#111827',
                        border: '1px solid var(--border-medium)',
                        color: '#FFFFFF',
                        borderRadius: '4px',
                        padding: '4px',
                        textAlign: 'right',
                      }}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ${item.unitPrice?.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-amber)' }}>
                    ${item.totalPrice?.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {duplicateItem && (
                      <button
                        onClick={() => duplicateItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Duplicate item"
                        aria-label={`Duplicate line ${idx + 1}: ${item.productName}`}
                      >
                        <Copy size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => removeItem(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Real-time Order Analytics Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            backgroundColor: '#111827',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Quantity</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Package size={20} color="var(--accent-amber)" />
              {totals.totalQuantity} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pcs</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Gross Weight</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Weight size={20} color="var(--accent-blue)" />
              {totals.estimatedWeightKg} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kg</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Master Cartons</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Boxes size={20} color="var(--accent-emerald)" />
              {totals.estimatedCartons} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ctns</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grand Total (FOB)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              ${totals.totalAmount?.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>USD</span>
            </div>
          </div>
        </div>

        {/* Price breakdown drawer (FE-12, display-only) */}
        <PriceBreakdown totals={totals} />

        {/* Shipping Marks & Special Instructions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Shipping Marks (For Outer Master Cartons)</label>
            <textarea
              rows={2}
              className="form-control"
              value={orderMetadata.shippingMarks}
              onChange={(e) =>
                setOrderMetadata({ ...orderMetadata, shippingMarks: e.target.value })
              }
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Special Packing & Pallet Instructions</label>
            <textarea
              rows={2}
              className="form-control"
              value={orderMetadata.specialInstructions}
              onChange={(e) =>
                setOrderMetadata({ ...orderMetadata, specialInstructions: e.target.value })
              }
            />
          </div>
        </div>

        {/* Submit / Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isAuthenticated ? (
              <span>
                Submitting as: <b style={{ color: '#FFFFFF' }}>{user.customerName}</b> ({user.businessName}, {user.country})
              </span>
            ) : (
              <span>
                ⚠️ You will be prompted to sign in or register before final export dispatch.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={submitting || cartItems.length === 0}
            className="btn btn-primary btn-lg"
            style={{ padding: '0.85rem 2rem' }}
          >
            <Sparkles size={18} />
            <span>{submitting ? 'Submitting Order...' : 'Submit Order to H.A. Overseas'}</span>
          </button>
        </div>
      </>
    )}
  </div>
);
