import React from 'react';

// Loading skeletons for list views (FE-16), replacing plain "Loading..."
// text so every list shows the same treatment while data is fetched.
// variant "rows": stacked card rows (orders, admin lists)
// variant "grid": card grid (product catalog)
export const ListSkeleton = ({ rows = 3, variant = 'rows' }) => {
  if (variant === 'grid') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="skeleton-block" style={{ height: '220px', borderRadius: 0 }} />
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div className="skeleton-block" style={{ height: '14px', width: '40%' }} />
              <div className="skeleton-block" style={{ height: '20px', width: '85%' }} />
              <div className="skeleton-block" style={{ height: '14px', width: '70%' }} />
              <div className="skeleton-block" style={{ height: '38px', width: '100%', marginTop: '0.5rem' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div className="skeleton-block" style={{ height: '20px', width: '55%' }} />
          <div className="skeleton-block" style={{ height: '14px', width: '35%' }} />
          <div className="skeleton-block" style={{ height: '14px', width: '75%' }} />
        </div>
      ))}
    </div>
  );
};
