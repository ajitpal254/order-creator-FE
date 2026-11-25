import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseConfigured } from '../../firebase';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { 
  Wrench, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const LoginPage = () => {
  const { login, googleLogin, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Two-factor challenge state (v0.4): set when login returns
  // { requires2fa, challengeToken } instead of a session.
  const [challengeToken, setChallengeToken] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [challengeExpired, setChallengeExpired] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/order-creator';

  // v0.4 (FE-13): buyer-role users land on their dashboard after login.
  // Staff keep their existing landing — admins to /admin, other staff to
  // the page they were sent from (or the order creator by default).
  const STAFF_ROLES = [
    'admin',
    'sales_manager',
    'production_supervisor',
    'qc_inspector',
    'shipping_officer',
    'super_admin',
  ];

  const navigateAfterLogin = (res) => {
    if (res.user.role === 'admin') {
      navigate('/admin');
    } else if (location.state?.from?.pathname) {
      navigate(redirectPath);
    } else if (!STAFF_ROLES.includes(res.user.role)) {
      navigate('/dashboard');
    } else {
      navigate(redirectPath);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await login(usernameOrEmail, password);
      if (res.requires2fa && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setChallengeExpired(false);
        setTwoFactorCode('');
        return;
      }
      navigateAfterLogin(res);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const resetChallenge = () => {
    setChallengeToken(null);
    setTwoFactorCode('');
    setChallengeExpired(false);
    setError(null);
    setPassword('');
  };

  const handleVerifyTwoFactor = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setError('Please enter your authentication code.');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const res = await verifyTwoFactor(challengeToken, twoFactorCode.trim());
      navigateAfterLogin(res);
    } catch (err) {
      const message = err.message || 'Verification failed. Please try again.';
      setError(message);
      setTwoFactorCode('');
      if (/expired|invalid challenge/i.test(message)) {
        setChallengeExpired(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await googleLogin();
      navigateAfterLogin(res);
    } catch (err) {
      setError(err.message || 'Google sign-in could not be completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Two-factor challenge screen: shown instead of the credentials form
  // when the login response asked for a code. Verifying completes the
  // login exactly like a normal sign-in (same storage + navigation).
  if (challengeToken) {
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
                borderRadius: 'var(--radius-lg)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
                marginBottom: '0.75rem',
              }}
            >
              <ShieldAlert size={26} color="#F59E0B" />
            </div>
            <h2 style={{ fontSize: '1.6rem', color: '#FFFFFF', marginBottom: '0.25rem' }}>
              Two-Factor Verification
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Enter the code from your authenticator app to finish signing in.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#F87171',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {challengeExpired ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                This sign-in challenge has expired or is no longer valid. Please start again.
              </p>
              <button
                type="button"
                onClick={resetChallenge}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Restart login
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyTwoFactor}>
              <div className="form-group">
                <label className="form-label" htmlFor="two-factor-code">
                  Authentication code
                </label>
                <input
                  id="two-factor-code"
                  type="text"
                  className="form-control"
                  placeholder="6-digit code or backup code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                  Enter the 6-digit code from your authenticator app, or one of
                  your backup codes.
                </p>
              </div>

              <button
                type="submit"
                disabled={verifying || !twoFactorCode.trim()}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {verifying ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={resetChallenge}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-amber)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              backgroundColor: '#1E293B',
              border: '1px solid var(--accent-amber)',
              borderRadius: 'var(--radius-lg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
              marginBottom: '0.75rem',
            }}
          >
            <Wrench size={26} color="#F59E0B" />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#FFFFFF', marginBottom: '0.25rem' }}>
            Portal Sign In
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            H.A. Overseas Wholesale & Order Creator Desk
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#F87171',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading || !isFirebaseConfigured}
          title={
            isFirebaseConfigured
              ? undefined
              : 'Google sign-in is not configured on this deployment'
          }
          className="btn btn-secondary"
          style={{
            width: '100%',
            marginBottom: isFirebaseConfigured ? '1.25rem' : '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            backgroundColor: '#131B2A',
            border: '1px solid var(--border-subtle)',
            opacity: isFirebaseConfigured ? 1 : 0.55,
            cursor: isFirebaseConfigured ? 'pointer' : 'not-allowed',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{googleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
        </button>

        {!isFirebaseConfigured && (
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              textAlign: 'center',
              marginBottom: '1.25rem',
            }}
          >
            Google sign-in is not configured on this deployment — please sign
            in with your username and password.
          </p>
        )}

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            margin: '1.25rem 0',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          <span>OR SIGN IN WITH USERNAME</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
        </div>

        {/* Standard Credentials Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username or Business Email</label>
            <div className="password-input-wrapper">
              <input
                type="text"
                required
                className="form-control"
                placeholder="haoverseas1313 or name@company.com"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-amber)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Order Desk'}
          </button>
        </form>

        {/* Sign up prompt */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have an export account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
            Register New Business Account
          </Link>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
};
