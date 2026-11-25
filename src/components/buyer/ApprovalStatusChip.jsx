import React from 'react';

// Approval status chip (v0.9 F3): shown on a buyer's orders when the
// order went through company approval. 'none' (or a missing value)
// renders nothing — orders without company approval look as before.
export const APPROVAL_STATUS_LABELS = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

const CHIP_CLASS = {
  pending: 'badge badge-amber',
  approved: 'badge badge-emerald',
  rejected: 'badge badge-rose',
};

export const approvalStatusLabel = (status) =>
  APPROVAL_STATUS_LABELS[status] || null;

export const ApprovalStatusChip = ({ order }) => {
  const status = order?.approvalStatus;
  const label = approvalStatusLabel(status);
  if (!label) return null;
  return <span className={CHIP_CLASS[status] || 'badge badge-slate'}>{label}</span>;
};

export default ApprovalStatusChip;
