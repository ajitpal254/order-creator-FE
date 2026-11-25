import React from 'react';
import { Modal } from '../../components/Modal';

export const ProductModal = ({ isProductModalOpen, setIsProductModalOpen, editingProduct, productForm, setProductForm, attributes, setUploadedImageFile, handleSaveProduct }) => (
  <Modal
    isOpen={isProductModalOpen}
    onClose={() => setIsProductModalOpen(false)}
    title={editingProduct ? 'Edit Product Catalog' : 'Add New Tool Model'}
    maxWidth="700px"
  >
    <form onSubmit={handleSaveProduct}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input
            type="text"
            required
            className="form-control"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">SKU / Item Code *</label>
          <input
            type="text"
            required
            className="form-control"
            value={productForm.sku}
            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="form-control form-select"
            value={productForm.category}
            onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
          >
            {attributes.categories.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Base FOB Price ($)</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            value={productForm.basePrice}
            onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">MOQ (pcs)</label>
          <input
            type="number"
            className="form-control"
            value={productForm.moq}
            onChange={(e) => setProductForm({ ...productForm, moq: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Lead Time (days)</label>
          <input
            type="number"
            className="form-control"
            value={productForm.leadTimeDays ?? ''}
            onChange={(e) => setProductForm({ ...productForm, leadTimeDays: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Stock Quantity</label>
          <input
            type="number"
            className="form-control"
            value={productForm.stockQuantity ?? ''}
            onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Availability Note</label>
          <input
            type="text"
            className="form-control"
            value={productForm.availabilityNote ?? ''}
            onChange={(e) => setProductForm({ ...productForm, availabilityNote: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Description & Technical Features</label>
        <textarea
          rows={3}
          className="form-control"
          value={productForm.description}
          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Upload Product Image (Optional)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="form-control"
          onChange={(e) => setUploadedImageFile(e.target.files[0])}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setIsProductModalOpen(false)}
          className="btn btn-secondary btn-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
        >
          {editingProduct ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  </Modal>
);
