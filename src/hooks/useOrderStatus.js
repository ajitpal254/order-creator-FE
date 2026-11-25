import { useState } from 'react';
import { orderApi } from '../api/client';

// Order-status modal state + update action, extracted verbatim from
// AdminDashboard (FE-04).
export const useOrderStatus = ({ setOrders, showToast }) => {
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('Confirmed');
  const [statusNote, setStatusNote] = useState('');

  // Update Status Action
  const handleUpdateStatus = async () => {
    if (!selectedOrderForStatus) return;
    try {
      const res = await orderApi.updateOrderStatus(selectedOrderForStatus._id, {
        status: newStatus,
        note: statusNote || `Status changed to ${newStatus} by Admin`,
      });
      if (res.success) {
        showToast(`Order #${selectedOrderForStatus.orderNumber} updated to ${newStatus}`);
        setSelectedOrderForStatus(null);
        setStatusNote('');
        const updated = await orderApi.getAllOrders();
        if (updated.success) setOrders(updated.data);
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  return {
    selectedOrderForStatus, setSelectedOrderForStatus, newStatus, setNewStatus,
    statusNote, setStatusNote, handleUpdateStatus,
  };
};
