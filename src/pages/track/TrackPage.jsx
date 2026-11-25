import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Package, AlertTriangle, Truck } from 'lucide-react';
import { trackingApi } from '../../api/tracking';
import { StatusBadge } from '../../components/StatusBadge';
import './track.css';

// Public tracking page (v0.6 F2) at /track/:token. No auth: the token in
// the URL is the credential and the lookup goes through
// trackingApi.getPublicTracking, which sends no session data. Renders
// only what the public endpoint returns (orderNumber, status, timeline,
// optional carrier / trackingNumber) — nothing else about the order.
export const TrackPage = () => {
  const { token } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tracking', 'public', token],
    queryFn: () => trackingApi.getPublicTracking(token),
    enabled: Boolean(token),
    retry: false,
  });

  const tracking = data?.data ?? data ?? null;

  return (
    <div className="track-page">
      <div className="container">
        <div className="glass-card track-card">
          {isLoading ? (
            <p className="track-message">Loading tracking information…</p>
          ) : isError || !tracking ? (
            <div style={{ textAlign: 'center' }}>
              <AlertTriangle
                size={44}
                color="var(--accent-amber)"
                style={{ margin: '0 auto 1rem', opacity: 0.8 }}
              />
              <h1 style={{ fontSize: '1.4rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>
                Tracking unavailable
              </h1>
              <p className="track-message">
                This tracking link is invalid or has expired.
              </p>
            </div>
          ) : (
            <>
              <div className="badge badge-amber">
                <Package size={14} />
                <span>ORDER TRACKING</span>
              </div>
              <h1 className="track-order-number">{tracking.orderNumber}</h1>
              <p className="track-subtitle">
                Current status: <StatusBadge status={tracking.status} />
              </p>

              {(tracking.carrier || tracking.trackingNumber) && (
                <div className="track-carrier">
                  {tracking.carrier && (
                    <span>
                      <Truck size={14} style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />
                      Carrier: <b>{tracking.carrier}</b>
                    </span>
                  )}
                  {tracking.trackingNumber && (
                    <span>
                      Tracking number: <b>{tracking.trackingNumber}</b>
                    </span>
                  )}
                </div>
              )}

              <div className="track-timeline">
                <span className="track-timeline-title">Shipment Timeline</span>
                {(tracking.timeline || []).length === 0 ? (
                  <p className="track-subtitle">No tracking updates yet.</p>
                ) : (
                  (tracking.timeline || []).map((entry, i) => (
                    <div key={i} className="track-timeline-entry">
                      <Clock size={14} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                      <span className="track-timeline-status">{entry.status}</span>
                      {entry.note && <span className="track-timeline-note">— {entry.note}</span>}
                      {(entry.updatedAt || entry.createdAt || entry.date) && (
                        <span className="track-timeline-date">
                          {new Date(entry.updatedAt || entry.createdAt || entry.date).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
