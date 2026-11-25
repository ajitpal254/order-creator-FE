import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export const AttributesTab = ({ attributes, newFinish, setNewFinish, newColor, setNewColor, newBrand, setNewBrand, newSize, setNewSize, handleAddFinish, handleDeleteFinish, handleAddColor, handleDeleteColor, handleAddBrand, handleDeleteBrand, handleAddSize, handleDeleteSize }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
    {/* Finishes Manager */}
    <div className="glass-card">
      <h3 style={{ color: '#FFFFFF', fontSize: '1.15rem', marginBottom: '0.25rem' }}>
        Tool Surface Finishes
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Finishes selectable by clients during order creation
      </p>

      <form onSubmit={handleAddFinish} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          placeholder="e.g. Copper Nickel Antique"
          className="form-control"
          style={{ flex: 1 }}
          value={newFinish.name}
          onChange={(e) => setNewFinish({ ...newFinish, name: e.target.value })}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add</span>
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {attributes.finishes.map((f) => (
          <div
            key={f._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#111827',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
            }}
          >
            <span>{f.name}</span>
            <button
              onClick={() => handleDeleteFinish(f._id)}
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* Colors Manager */}
    <div className="glass-card">
      <h3 style={{ color: '#FFFFFF', fontSize: '1.15rem', marginBottom: '0.25rem' }}>
        Tool & Grease Gun Colors
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Powder coating & paint color palette
      </p>

      <form onSubmit={handleAddColor} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="color"
          style={{ width: '40px', height: '38px', padding: '2px', background: '#111827', border: '1px solid var(--border-medium)', borderRadius: '4px', cursor: 'pointer' }}
          value={newColor.hexCode}
          onChange={(e) => setNewColor({ ...newColor, hexCode: e.target.value })}
        />
        <input
          type="text"
          placeholder="Color Name (e.g. Electric Orange)"
          className="form-control"
          style={{ flex: 1 }}
          value={newColor.name}
          onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add</span>
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {attributes.colors.map((c) => (
          <div
            key={c._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#111827',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="color-swatch-dot" style={{ backgroundColor: c.hexCode }} />
              <span>{c.name}</span>
            </div>
            <button
              onClick={() => handleDeleteColor(c._id)}
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* Brands Manager */}
    <div className="glass-card">
      <h3 style={{ color: '#FFFFFF', fontSize: '1.15rem', marginBottom: '0.25rem' }}>
        Brand & Private Labels
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Brand marking options for tools
      </p>

      <form onSubmit={handleAddBrand} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          placeholder="Brand / OEM Marking"
          className="form-control"
          style={{ flex: 1 }}
          value={newBrand.name}
          onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add</span>
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {attributes.brands.map((b) => (
          <div
            key={b._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#111827',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
            }}
          >
            <span>{b.name}</span>
            <button
              onClick={() => handleDeleteBrand(b._id)}
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* Sizes Manager */}
    <div className="glass-card">
      <h3 style={{ color: '#FFFFFF', fontSize: '1.15rem', marginBottom: '0.25rem' }}>
        Standard Tool Sizes
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Capacity, length, and dimension presets
      </p>

      <form onSubmit={handleAddSize} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          placeholder="Size (e.g. 16 Inch / 400mm)"
          className="form-control"
          style={{ flex: 1 }}
          value={newSize.label}
          onChange={(e) => setNewSize({ ...newSize, label: e.target.value })}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add</span>
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {attributes.sizes.map((s) => (
          <div
            key={s._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#111827',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
            }}
          >
            <span>{s.label}</span>
            <button
              onClick={() => handleDeleteSize(s._id)}
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);
