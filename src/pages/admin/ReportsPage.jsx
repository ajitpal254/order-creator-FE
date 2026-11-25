import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock,
  Download,
  Factory,
  TrendingUp,
} from 'lucide-react';
import { reportsApi } from '../../api/reports';
import {
  getAgeingBuckets,
  getBacklogRows,
  getRevenueRows,
  rowAmount,
  rowCount,
  rowLabel,
  useBacklog,
  useReceivablesAgeing,
  useRevenue,
} from '../../hooks/useReports';
import { ListSkeleton } from '../../components/ListSkeleton';
import './reports.css';

// Admin reports (v0.6 F3): revenue, receivables ageing and production
// backlog for the admin desk. Admin-only — the route is wrapped in the
// same AdminRoute guard as /admin in src/App.jsx.
//
// DISPLAY-ONLY: every figure on this page is a value returned by the
// reports API, rendered as-is. Nothing is summed, averaged or otherwise
// re-aggregated client-side; totals (e.g. totalOutstanding) come from
// the API payload itself. CSV downloads use the authenticated blob
// pattern from src/api/reports.js — the invoice/PDF flow is untouched.

const GROUP_OPTIONS = [
  { value: 'product', label: 'Product' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'country', label: 'Country' },
];

// Render a returned figure exactly as the API sent it.
const displayValue = (value) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const SectionError = ({ message, onRetry }) => (
  <div className="reports-page__error" role="alert">
    <AlertCircle size={18} />
    <span>{message}</span>
    {onRetry && (
      <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

const EmptyState = ({ children }) => (
  <div className="glass-card reports-page__empty">{children}</div>
);

export const ReportsPage = () => {
  const [groupBy, setGroupBy] = useState('product');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(null); // 'revenue' | 'ageing'
  const [downloadError, setDownloadError] = useState(null);

  const revenue = useRevenue({ groupBy, from, to });
  const ageing = useReceivablesAgeing();
  const backlog = useBacklog();

  const revenueRows = getRevenueRows(revenue.data);
  const ageingBuckets = getAgeingBuckets(ageing.data);
  const totalOutstanding = ageing.data?.totalOutstanding;
  const backlogRows = getBacklogRows(backlog.data);

  const handleDownload = async (kind) => {
    setDownloadError(null);
    setDownloading(kind);
    try {
      if (kind === 'revenue') {
        await reportsApi.downloadRevenueCsv({ groupBy, from, to });
      } else {
        await reportsApi.downloadAgeingCsv();
      }
    } catch (err) {
      setDownloadError(`Could not download the CSV: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="reports-page">
      <div className="container">
        <Link to="/admin" className="reports-page__back">
          <ArrowLeft size={15} />
          <span>Back to Admin Dashboard</span>
        </Link>

        {/* Header */}
        <div className="reports-page__header">
          <div className="badge badge-rose" style={{ marginBottom: '0.5rem' }}>
            <BarChart3 size={14} />
            <span>H.A. OVERSEAS REPORTS</span>
          </div>
          <h1 className="reports-page__title">Reports</h1>
          <p className="reports-page__subtitle">
            Revenue, receivables ageing and production backlog — figures exactly as
            reported by the server.
          </p>
        </div>

        {downloadError && (
          <p className="reports-page__download-error" role="alert">
            {downloadError}
          </p>
        )}

        {/* (a) Revenue */}
        <section className="reports-page__section" aria-label="Revenue">
          <div className="reports-page__section-head">
            <h2 className="reports-page__section-title">
              <TrendingUp size={20} />
              <span>Revenue</span>
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownload('revenue')}
              disabled={downloading === 'revenue'}
            >
              <Download size={15} />
              <span>{downloading === 'revenue' ? 'Downloading…' : 'Download revenue CSV'}</span>
            </button>
          </div>

          <div className="reports-page__controls">
            <div className="reports-page__group-switcher" role="group" aria-label="Group revenue by">
              {GROUP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={groupBy === option.value}
                  onClick={() => setGroupBy(option.value)}
                  className={`btn btn-sm ${groupBy === option.value ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="reports-page__date-field">
              <span className="reports-page__date-label">From</span>
              <input
                type="date"
                aria-label="From date"
                className="form-control reports-page__date-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="reports-page__date-field">
              <span className="reports-page__date-label">To</span>
              <input
                type="date"
                aria-label="To date"
                className="form-control reports-page__date-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>

          {revenue.isLoading && <ListSkeleton rows={3} />}
          {revenue.isError && (
            <SectionError
              message={`Failed to load revenue: ${revenue.error?.message || 'please try again.'}`}
              onRetry={() => revenue.refetch()}
            />
          )}
          {!revenue.isLoading && !revenue.isError && revenueRows.length === 0 && (
            <EmptyState>No revenue data for this selection.</EmptyState>
          )}
          {!revenue.isLoading && !revenue.isError && revenueRows.length > 0 && (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th scope="col">
                      {GROUP_OPTIONS.find((o) => o.value === groupBy)?.label || 'Group'}
                    </th>
                    <th scope="col">Amount</th>
                    <th scope="col">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueRows.map((row, i) => (
                    <tr key={row._id ?? row.id ?? `${rowLabel(row)}-${i}`}>
                      <td>{displayValue(rowLabel(row))}</td>
                      <td>{displayValue(rowAmount(row))}</td>
                      <td>{displayValue(rowCount(row))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* (b) Receivables ageing */}
        <section className="reports-page__section" aria-label="Receivables ageing">
          <div className="reports-page__section-head">
            <h2 className="reports-page__section-title">
              <Clock size={20} />
              <span>Receivables Ageing</span>
            </h2>
            <div className="reports-page__total">
              <span className="reports-page__total-label">Total Outstanding</span>
              <span className="reports-page__total-value">
                {ageing.isLoading ? '…' : displayValue(totalOutstanding)}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownload('ageing')}
              disabled={downloading === 'ageing'}
            >
              <Download size={15} />
              <span>{downloading === 'ageing' ? 'Downloading…' : 'Download ageing CSV'}</span>
            </button>
          </div>

          {ageing.isLoading && <ListSkeleton rows={3} />}
          {ageing.isError && (
            <SectionError
              message={`Failed to load receivables ageing: ${ageing.error?.message || 'please try again.'}`}
              onRetry={() => ageing.refetch()}
            />
          )}
          {!ageing.isLoading && !ageing.isError && ageingBuckets.length === 0 && (
            <EmptyState>No outstanding receivables.</EmptyState>
          )}
          {!ageing.isLoading && !ageing.isError && ageingBuckets.length > 0 && (
            <>
              <div className="reports-page__cards">
                {ageingBuckets.map((bucket, i) => (
                  <div
                    key={bucket._id ?? bucket.id ?? bucket.key ?? `${rowLabel(bucket)}-${i}`}
                    className="glass-card reports-page__card"
                  >
                    <span className="reports-page__card-label">{displayValue(rowLabel(bucket))}</span>
                    <div className="reports-page__card-value reports-page__card-value--amber">
                      {displayValue(rowAmount(bucket))}
                    </div>
                    {rowCount(bucket) !== null && rowCount(bucket) !== undefined && (
                      <span className="reports-page__card-meta">
                        Count: {displayValue(rowCount(bucket))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th scope="col">Bucket</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ageingBuckets.map((bucket, i) => (
                      <tr key={bucket._id ?? bucket.id ?? bucket.key ?? `${rowLabel(bucket)}-${i}`}>
                        <td>{displayValue(rowLabel(bucket))}</td>
                        <td>{displayValue(rowAmount(bucket))}</td>
                        <td>{displayValue(rowCount(bucket))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* (c) Production backlog */}
        <section className="reports-page__section" aria-label="Production backlog">
          <div className="reports-page__section-head">
            <h2 className="reports-page__section-title">
              <Factory size={20} />
              <span>Production Backlog</span>
            </h2>
          </div>

          {backlog.isLoading && <ListSkeleton rows={3} />}
          {backlog.isError && (
            <SectionError
              message={`Failed to load production backlog: ${backlog.error?.message || 'please try again.'}`}
              onRetry={() => backlog.refetch()}
            />
          )}
          {!backlog.isLoading && !backlog.isError && backlogRows.length === 0 && (
            <EmptyState>No open orders in the backlog.</EmptyState>
          )}
          {!backlog.isLoading && !backlog.isError && backlogRows.length > 0 && (
            <div className="reports-page__cards">
              {backlogRows.map((row, i) => (
                <div
                  key={row._id ?? row.id ?? row.key ?? `${rowLabel(row)}-${i}`}
                  className="glass-card reports-page__card"
                >
                  <span className="reports-page__card-label">{displayValue(rowLabel(row))}</span>
                  <div className="reports-page__card-value">
                    {displayValue(rowCount(row) ?? rowAmount(row))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
