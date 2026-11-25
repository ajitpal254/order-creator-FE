import React from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';

export const ProductsTab = ({ products, attributes, setEditingProduct, setProductForm, setIsProductModalOpen, handleDeleteProduct }) => (
  <div className="glass-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <div>
        <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem' }}>Catalog Tools & Grease Guns</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Add new products or configure allowed variants</p>
      </div>
      <button
        onClick={() => {
          setEditingProduct(null);
          setProductForm({
            name: '',
            sku: '',
            category: attributes.categories[0]?.name || 'Grease Guns & Lubrication',
            description: '',
            basePrice: 10,
            moq: 50,
            leadTimeDays: '',
            stockQuantity: '',
            availabilityNote: '',
            weightKg: 1.0,
            pcsPerCarton: 20,
            allowedSizes: attributes.sizes.slice(0, 3).map((s) => s.label),
            allowedFinishes: attributes.finishes.slice(0, 3).map((f) => f.name),
            allowedColors: attributes.colors.slice(0, 3).map((c) => c.name),
            allowedBrands: attributes.brands.map((b) => b.name),
            images: [],
          });
          setIsProductModalOpen(true);
        }}
        className="btn btn-primary btn-sm"
      >
        <Plus size={16} />
        <span>Add New Tool Model</span>
      </button>
    </div>

    <div className="table-responsive">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name & SKU</th>
            <th>Category</th>
            <th style={{ textAlign: 'right' }}>Base Price</th>
            <th>MOQ & Packing</th>
            <th>Allowed Finishes</th>
            <th style={{ textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td style={{ width: '60px' }}>
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=100&q=80'}
                  alt={p.name}
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                />
              </td>
              <td>
                <b style={{ color: '#FFFFFF', display: 'block' }}>{p.name}</b>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber-light)' }}>SKU: {p.sku}</span>
              </td>
              <td>{p.category}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-amber)' }}>
                ${p.basePrice?.toFixed(2)}
              </td>
              <td>
                MOQ: {p.moq} pcs | {p.pcsPerCarton} pcs/ctn
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {p.allowedFinishes?.slice(0, 2).map((fn, i) => (
                    <span key={i} className="badge badge-slate" style={{ fontSize: '0.65rem' }}>{fn}</span>
                  ))}
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setProductForm({
                        ...p,
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    title="Edit Product"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p._id, p.name)}
                    className="btn btn-danger btn-sm"
                    title="Delete Product"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
