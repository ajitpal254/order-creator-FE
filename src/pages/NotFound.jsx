import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Layers } from 'lucide-react';

// 404 page for unknown routes (FE-16). Previously the catch-all route
// silently redirected to home, hiding broken links.
export const NotFound = () => {
  return (
    <div style={{ padding: '4rem 0' }}>
      <div className="container">
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
          <Compass size={54} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <div className="badge badge-amber" style={{ marginBottom: '1rem' }}>
            <span>ERROR 404</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>Page not found</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-primary">
              <Home size={16} />
              <span>Back to Home</span>
            </Link>
            <Link to="/catalog" className="btn btn-secondary">
              <Layers size={16} />
              <span>Browse Catalog</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
