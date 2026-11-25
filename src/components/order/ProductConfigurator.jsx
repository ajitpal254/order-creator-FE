import React from 'react';
import { Plus } from 'lucide-react';

export const ProductConfigurator = ({ currentProduct, products, attributes, selectedProductId, handleProductChange, selectedSize, setSelectedSize, selectedFinish, setSelectedFinish, selectedColor, setSelectedColor, selectedBrand, setSelectedBrand, selectedPackaging, setSelectedPackaging, customMarking, setCustomMarking, quantity, setQuantity, unitPriceOverride, setUnitPriceOverride, handleAddLineItem }) => (
  <div className="glass-card highlight" style={{ padding: '1.75rem' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <h2 style={{ fontSize: '1.3rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            backgroundColor: 'var(--accent-amber)',
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
          1
        </span>
        Configure Tool Specifications & Variants
      </h2>
      {currentProduct && (
        <span className="badge badge-blue">
          Selected SKU: {currentProduct.sku}
        </span>
      )}
    </div>

    <form onSubmit={handleAddLineItem}>
      {/* Selected Tool Live Preview */}
      {currentProduct && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: '#111827',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
          >
            <img
              src={currentProduct.images?.[0] || 'https://haoverseas.com/img-products/com-span.jpg'}
              alt={currentProduct.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
              {currentProduct.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)' }}>
              Category: {currentProduct.category} | SKU: {currentProduct.sku} | MOQ: {currentProduct.moq} pcs | Weight: {currentProduct.weightKg} kg/pc
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Product Selection & Image Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Select Tool Model / Category *</label>
          <select
            className="form-control form-select"
            value={selectedProductId}
            onChange={handleProductChange}
          >
            {products.map((p) => (
              <option key={p._id} value={p._id} style={{ background: '#131B2A' }}>
                {p.name} ({p.sku}) — Base ${p.basePrice?.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Size / Dimension / Capacity *</label>
          <select
            className="form-control form-select"
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
          >
            {(currentProduct?.allowedSizes?.length ? currentProduct.allowedSizes : attributes.sizes.map((s) => s.label)).map((sz, i) => (
              <option key={i} value={sz} style={{ background: '#131B2A' }}>
                {sz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Finish & Color Selection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Surface Finish & Plating *</label>
          <select
            className="form-control form-select"
            value={selectedFinish}
            onChange={(e) => setSelectedFinish(e.target.value)}
          >
            {(currentProduct?.allowedFinishes?.length ? currentProduct.allowedFinishes : attributes.finishes.map((f) => f.name)).map((fn, i) => (
              <option key={i} value={fn} style={{ background: '#131B2A' }}>
                {fn}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Colorway / Paint Coating *</label>
          <select
            className="form-control form-select"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
          >
            {(currentProduct?.allowedColors?.length ? currentProduct.allowedColors : attributes.colors.map((c) => c.name)).map((cl, i) => (
              <option key={i} value={cl} style={{ background: '#131B2A' }}>
                {cl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Brand Marking, Packaging, Quantity, Price */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Brand Marking *</label>
          <select
            className="form-control form-select"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            {(currentProduct?.allowedBrands?.length ? currentProduct.allowedBrands : attributes.brands.map((b) => b.name)).map((br, i) => (
              <option key={i} value={br} style={{ background: '#131B2A' }}>
                {br}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Packaging Type</label>
          <select
            className="form-control form-select"
            value={selectedPackaging}
            onChange={(e) => setSelectedPackaging(e.target.value)}
          >
            <option value="Master Carton (Standard Export)" style={{ background: '#131B2A' }}>Master Export Carton</option>
            <option value="Individual Color Display Box" style={{ background: '#131B2A' }}>Individual Color Box</option>
            <option value="Heavy Duty Blister Card" style={{ background: '#131B2A' }}>Heavy Blister Card</option>
            <option value="Heavy Canvas Roll Pouch" style={{ background: '#131B2A' }}>Canvas Roll Pouch</option>
            <option value="Polybag with Barcode Sticker" style={{ background: '#131B2A' }}>Polybag with Barcode</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Quantity (Pieces) *</label>
          <input
            type="number"
            min={1}
            required
            className="form-control"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {currentProduct && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              MOQ: {currentProduct.moq || 50} pcs | ~{Math.ceil(quantity / (currentProduct.pcsPerCarton || 20))} ctns
            </span>
          )}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">FOB Price / Pc ($ USD)</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            value={unitPriceOverride}
            onChange={(e) => setUnitPriceOverride(e.target.value)}
          />
        </div>
      </div>

      {/* Row 4: Custom Marking Text & Submit Line Item */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Custom Buyer Laser Marking / Embossing Note (Optional)</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Laser mark: 'APEX PRO HEAVY DUTY' + Lot #44"
            value={customMarking}
            onChange={(e) => setCustomMarking(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ height: '42px', padding: '0 1.75rem' }}
        >
          <Plus size={18} />
          <span>Add Line Item</span>
        </button>
      </div>
    </form>
  </div>
);
