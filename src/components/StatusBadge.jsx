import React from 'react';
import { useTranslation } from 'react-i18next';

// Status -> i18n key (FE-15). Unknown statuses fall back to the raw
// API value, exactly as before.
const STATUS_KEYS = {
  Draft: 'status.draft',
  Submitted: 'status.submitted',
  'Under Review': 'status.underReview',
  Confirmed: 'status.confirmed',
  'In Production': 'status.inProduction',
  Dispatched: 'status.dispatched',
  Completed: 'status.completed',
  Cancelled: 'status.cancelled',
};

export const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  let badgeClass = 'badge-slate';

  switch (status) {
    case 'Draft':
      badgeClass = 'badge-slate';
      break;
    case 'Submitted':
      badgeClass = 'badge-blue';
      break;
    case 'Under Review':
      badgeClass = 'badge-amber';
      break;
    case 'Confirmed':
      badgeClass = 'badge-purple';
      break;
    case 'In Production':
      badgeClass = 'badge-amber';
      break;
    case 'Dispatched':
      badgeClass = 'badge-blue';
      break;
    case 'Completed':
      badgeClass = 'badge-emerald';
      break;
    case 'Cancelled':
      badgeClass = 'badge-rose';
      break;
    default:
      badgeClass = 'badge-slate';
  }

  const key = STATUS_KEYS[status];
  return <span className={`badge ${badgeClass}`}>{key ? t(key) : status}</span>;
};
