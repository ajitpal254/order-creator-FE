import React, { useState } from 'react';
import { AlertCircle, ClipboardCheck } from 'lucide-react';
import {
  useApproveOrder,
  usePendingCompanyApprovals,
  useRejectOrder,
} from '../../hooks/useCompanies';
import { ApprovalOrderRow } from './ApprovalOrderRow';

// Approval queue for the buyer dashboard (v0.9 F3): company orders with
// approvalStatus 'pending' across every company where the signed-in
// user is an owner / admin / approver. Renders nothing when there is
// nothing to approve (or the companies load fails) so the dashboard is
// unchanged for buyers who never approve.
export const CompanyApprovals = () => {
  const { pending, isLoading } = usePendingCompanyApprovals();
  const approveOrder = useApproveOrder();
  const rejectOrder = useRejectOrder();
  const [error, setError] = useState(null);

  if (isLoading || pending.length === 0) return null;

  const handleApprove = (order) => {
    setError(null);
    approveOrder.mutate(order._id, {
      onError: (err) =>
        setError(err.message || 'Could not approve that order.'),
    });
  };

  const handleReject = async (order, reason) => {
    setError(null);
    try {
      await rejectOrder.mutateAsync({ orderId: order._id, reason });
    } catch (err) {
      setError(err.message || 'Could not reject that order.');
    }
  };

  return (
    <section className="buyer-dashboard__section">
      <h2 className="buyer-dashboard__section-title">
        <ClipboardCheck size={20} />
        <span>Company orders awaiting your approval</span>
      </h2>
      {error && (
        <div className="buyer-dashboard__error-banner" role="alert">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      <div className="buyer-dashboard__list">
        {pending.map(({ company, order }) => (
          <ApprovalOrderRow
            key={`${company._id || company.id}-${order._id}`}
            order={{ ...order, company: order.company ?? company }}
            busy={approveOrder.isPending || rejectOrder.isPending}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </section>
  );
};

export default CompanyApprovals;
