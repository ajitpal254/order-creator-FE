import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/client';
import { CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

// Landed on from the password-reset email link:
//   /reset-password?token=<reset token>
// The token is single-use and expires 30 minutes after it was issued.
export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.resetPassword({ token, newPassword });
      setSuccess(true);
      setError(null);
      void res;
    } catch (err) {
      setError(err.message || 'Reset failed. The link may have expired — request a new one from the login page.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              backgroundColor: '#1E293B',
              border: '1px solid var(--accent-amber)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <KeyRound size={26} color="var(--accent-amber)" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Set a New Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Choose a new password for your H.A. Overseas account.
          </p>
        </div>

        {!token ? (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
            This reset link is missing its token. Please request a new reset link from the{' '}
            <Link to="/login" style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
              login page
            </Link>
            .
          </div>
        ) : success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>Password Updated!</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your password has been successfully reset. You may now sign in.
            </p>
            <Link to="/login" className="btn btn-primary btn-sm">
              Proceed to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">New Password (Min 6 chars)</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-control"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-control"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
