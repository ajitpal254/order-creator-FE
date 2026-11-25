import React from 'react';
import { Check } from 'lucide-react';

export const AdminToast = ({ toastMessage }) => (
  <>
{toastMessage && (
  <div
    className="animate-fade-in"
    style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: '#10B981',
      color: '#090D16',
      padding: '0.85rem 1.5rem',
      borderRadius: 'var(--radius-md)',
      fontWeight: 700,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}
  >
    <Check size={18} />
    <span>{toastMessage}</span>
  </div>
)}
  </>
);
