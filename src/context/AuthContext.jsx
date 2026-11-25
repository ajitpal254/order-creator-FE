import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';
import { twoFactorApi } from '../api/twoFactor';
import { auth, googleProvider, signInWithPopup } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('hao_token') || null);
  const [loading, setLoading] = useState(true);

  // Load current user profile on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (err) {
          console.warn('Session restoration failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  // Store a completed session exactly as every login path always has.
  const applySession = (res) => {
    localStorage.setItem('hao_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const login = async (usernameOrEmail, password) => {
    const res = await authApi.login({ usernameOrEmail, password });
    // Two-factor challenge: no session yet — hand the challenge back to
    // the caller (LoginPage) so it can collect the code. Nothing is
    // stored until verifyTwoFactor completes the login.
    if (res.success && res.requires2fa && res.challengeToken) {
      return res;
    }
    if (res.success && res.token) {
      return applySession(res);
    }
    throw new Error(res.message || 'Login failed');
  };

  // Completes a 2FA-challenged login. On success the user lands in
  // exactly the same state as a normal login (token stored, user set).
  const verifyTwoFactor = async (challengeToken, code) => {
    const res = await twoFactorApi.verify({ challengeToken, code });
    if (res.success && res.token) {
      return applySession(res);
    }
    throw new Error(res.message || 'Two-factor verification failed');
  };

  const markTwoFactorEnabled = (enabled) => {
    setUser((prev) => (prev ? { ...prev, twoFactorEnabled: enabled } : prev));
  };

  const signup = async (userData) => {
    const res = await authApi.signup(userData);
    if (res.success && res.token) {
      localStorage.setItem('hao_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Signup failed');
  };

  const googleLogin = async () => {
    // Firebase must be configured (VITE_FIREBASE_* env vars). Without it
    // there is no trustworthy way to prove the Google identity, so fail
    // with a clear error the login form can show — never fall back to
    // asking the user to type an email (the server cannot verify that).
    if (!auth || !googleProvider) {
      throw new Error(
        'Google sign-in is not available: Firebase is not configured on this deployment.'
      );
    }

    // Firebase verifies the identity with Google. The backend must only
    // trust the signed ID token — email, name and uid are read from the
    // verified token server-side, never from fields this client sends.
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();

    const res = await authApi.googleAuth({ idToken });

    if (res.success && res.token) {
      localStorage.setItem('hao_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Google sign-in failed');
  };

  const logout = () => {
    // Tell the server to revoke the refresh token + clear its cookie.
    // Local state clears immediately either way — a failed call must not
    // trap the user in a logged-in UI.
    authApi.logout().catch(() => {});
    localStorage.removeItem('hao_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await authApi.updateProfile(data);
    if (res.success && res.user) {
      setUser(res.user);
      return res;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        isAdmin: user?.role === 'admin',
        login,
        verifyTwoFactor,
        markTwoFactorEnabled,
        signup,
        googleLogin,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
