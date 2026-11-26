import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, Copy, ShieldCheck, ShieldOff } from 'lucide-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { twoFactorApi } from '../../api/twoFactor';
import { queryClient } from '../../lib/queryClient.js';
import { AddressesSection } from './AddressesSection';

// Staff roles that may manage two-factor authentication (v0.4).
// Buyers ('buyer' / 'user') never see the 2FA section.
export const STAFF_ROLES = [
  'admin',
  'sales_manager',
  'production_supervisor',
  'qc_inspector',
  'shipping_officer',
  'super_admin',
];

const errorBannerStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  color: '#F87171',
  padding: '0.85rem',
  borderRadius: 'var(--radius-md)',
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontSize: '0.85rem',
};

const successBannerStyle = {
  ...errorBannerStyle,
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  border: '1px solid rgba(34, 197, 94, 0.35)',
  color: '#4ADE80',
};

const selectableTextStyle = {
  userSelect: 'all',
  wordBreak: 'break-all',
  backgroundColor: 'var(--bg-surface, #0F172A)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '0.75rem',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  color: '#FFFFFF',
};

export const SettingsPage = () => {
  const { user, updateProfile, markTwoFactorEnabled } = useAuth();
  const isStaff = STAFF_ROLES.includes(user?.role);

  // --- Two-factor state ---
  // The user object may not carry twoFactorEnabled yet; absent = not enabled.
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    Boolean(user?.twoFactorEnabled)
  );
  useEffect(() => {
    setTwoFactorEnabled(Boolean(user?.twoFactorEnabled));
  }, [user?.twoFactorEnabled]);

  // step: 'idle' | 'setup' (secret shown, awaiting code) | 'backup' (codes shown once)
  const [step, setStep] = useState('idle');
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [ackSaved, setAckSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState(null);
  const [twoFactorMessage, setTwoFactorMessage] = useState(null);

  const handleSetup = async () => {
    setTwoFactorBusy(true);
    setTwoFactorError(null);
    setTwoFactorMessage(null);
    try {
      const res = await twoFactorApi.setup();
      setSetupData({ secret: res.secret, otpauthUri: res.otpauthUri });
      setSetupCode('');
      setStep('setup');
    } catch (err) {
      setTwoFactorError(err.message || 'Could not start two-factor setup.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleEnable = async (e) => {
    e.preventDefault();
    setTwoFactorBusy(true);
    setTwoFactorError(null);
    try {
      const res = await twoFactorApi.enable({ code: setupCode.trim() });
      setBackupCodes(res.backupCodes || []);
      setAckSaved(false);
      setCopied(false);
      setStep('backup');
      setTwoFactorEnabled(true);
      markTwoFactorEnabled?.(true);
    } catch (err) {
      setTwoFactorError(err.message || 'Could not enable two-factor authentication.');
      setSetupCode('');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleFinishBackup = () => {
    // The acknowledgement must be ticked before leaving this step —
    // the button stays disabled until then (see render below).
    if (!ackSaved) return;
    setBackupCodes([]);
    setSetupData(null);
    setStep('idle');
    setTwoFactorMessage('Two-factor authentication is now enabled.');
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setTwoFactorBusy(true);
    setTwoFactorError(null);
    setTwoFactorMessage(null);
    try {
      await twoFactorApi.disable({ code: disableCode.trim() });
      setTwoFactorEnabled(false);
      markTwoFactorEnabled?.(false);
      setDisableCode('');
      setTwoFactorMessage('Two-factor authentication has been disabled.');
    } catch (err) {
      setTwoFactorError(err.message || 'Could not disable two-factor authentication.');
      setDisableCode('');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  // --- Notifications state ---
  // Profile updates go through the existing endpoint: AuthContext.updateProfile
  // calls authApi.updateProfile -> PUT /auth/profile (src/api/client.js).
  const [emailNotifications, setEmailNotifications] = useState(
    user?.notifications?.email ?? true
  );
  useEffect(() => {
    if (typeof user?.notifications?.email === 'boolean') {
      setEmailNotifications(user.notifications.email);
    }
  }, [user?.notifications?.email]);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [notificationsMessage, setNotificationsMessage] = useState(null);

  const handleToggleEmailNotifications = async (e) => {
    const next = e.target.checked;
    const previous = emailNotifications;
    setEmailNotifications(next);
    setNotificationsBusy(true);
    setNotificationsError(null);
    setNotificationsMessage(null);
    try {
      // Merge with any other notification preferences already on the user.
      await updateProfile({
        notifications: { ...(user?.notifications || {}), email: next },
      });
      setNotificationsMessage('Notification preferences saved.');
    } catch (err) {
      setEmailNotifications(previous);
      setNotificationsError(err.message || 'Could not save notification preferences.');
    } finally {
      setNotificationsBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h2 style={{ fontSize: '1.6rem', color: '#FFFFFF', marginBottom: '0.25rem' }}>
        Account Settings
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Manage your account security and notification preferences.
      </p>

      {isStaff && (
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#FFFFFF', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Two-factor authentication
          </h3>

          {twoFactorError && (
            <div style={errorBannerStyle}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{twoFactorError}</span>
            </div>
          )}
          {twoFactorMessage && (
            <div style={successBannerStyle}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{twoFactorMessage}</span>
            </div>
          )}

          {step === 'backup' ? (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                Two-factor authentication is enabled. Save these backup codes
                somewhere safe — each one can be used once to sign in if you
                lose access to your authenticator app. They are shown only once.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                {backupCodes.map((code) => (
                  <div key={code} style={{ ...selectableTextStyle, textAlign: 'center' }}>
                    {code}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopyBackupCodes}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
              >
                <Copy size={16} />
                {copied ? 'Copied!' : 'Copy backup codes'}
              </button>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  marginBottom: '1rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={ackSaved}
                  onChange={(e) => setAckSaved(e.target.checked)}
                />
                I&apos;ve saved these codes
              </label>
              <button
                type="button"
                onClick={handleFinishBackup}
                disabled={!ackSaved}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          ) : twoFactorEnabled ? (
            <div>
              <p
                style={{
                  color: '#4ADE80',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <ShieldCheck size={18} />
                Two-factor authentication is enabled for your account.
              </p>
              <form onSubmit={handleDisable}>
                <div className="form-group">
                  <label className="form-label" htmlFor="two-factor-disable-code">
                    Current authentication code
                  </label>
                  <input
                    id="two-factor-disable-code"
                    type="text"
                    className="form-control"
                    placeholder="6-digit code or backup code"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    autoComplete="one-time-code"
                  />
                </div>
                <button
                  type="submit"
                  disabled={twoFactorBusy || !disableCode.trim()}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <ShieldOff size={16} />
                  {twoFactorBusy ? 'Disabling...' : 'Disable two-factor authentication'}
                </button>
              </form>
            </div>
          ) : step === 'setup' && setupData ? (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                Add this account to your authenticator app using the secret or
                the setup URI below, then enter the 6-digit code it shows to confirm.
              </p>
              <div className="form-group">
                <label className="form-label">Secret key</label>
                <div style={selectableTextStyle}>{setupData.secret}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Setup URI (otpauth)</label>
                <div style={selectableTextStyle}>{setupData.otpauthUri}</div>
              </div>
              <form onSubmit={handleEnable}>
                <div className="form-group">
                  <label className="form-label" htmlFor="two-factor-setup-code">
                    Confirmation code
                  </label>
                  <input
                    id="two-factor-setup-code"
                    type="text"
                    className="form-control"
                    placeholder="6-digit code"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value)}
                    autoComplete="one-time-code"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    disabled={twoFactorBusy || !setupCode.trim()}
                    className="btn btn-primary"
                  >
                    {twoFactorBusy ? 'Enabling...' : 'Enable two-factor authentication'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('idle');
                      setSetupData(null);
                      setTwoFactorError(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Protect your staff account with a one-time code from an
                authenticator app in addition to your password.
              </p>
              <button
                type="button"
                onClick={handleSetup}
                disabled={twoFactorBusy}
                className="btn btn-primary"
              >
                {twoFactorBusy ? 'Starting setup...' : 'Set up two-factor authentication'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved addresses (v0.5 F3). The section is TanStack Query-powered;
          it is wrapped in a provider bound to the app's shared queryClient
          so the section works even where SettingsPage is rendered without
          an outer provider (the app root provides the same client). */}
      <QueryClientProvider client={queryClient}>
        <AddressesSection />
      </QueryClientProvider>

      <div className="glass-card">
        <h3
          style={{
            color: '#FFFFFF',
            fontSize: '1.1rem',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Bell size={18} />
          Notifications
        </h3>

        {notificationsError && (
          <div style={errorBannerStyle}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{notificationsError}</span>
          </div>
        )}
        {notificationsMessage && (
          <div style={successBannerStyle}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{notificationsMessage}</span>
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={handleToggleEmailNotifications}
            disabled={notificationsBusy}
          />
          Email notifications
        </label>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Receive order updates and account notices by email.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
