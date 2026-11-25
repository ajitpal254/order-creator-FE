import React from 'react';

// Suspense fallback shown while a lazily-loaded route chunk is fetched.
// Matches the loading treatment already used on the catalog page.
export const PageLoader = () => (
  <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
    <div className="animate-glow" style={{ fontSize: '1.1rem', color: 'var(--accent-amber)' }}>
      Loading...
    </div>
  </div>
);
