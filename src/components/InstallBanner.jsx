import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';

export const INSTALL_DISMISSED_KEY = 'hao-install-dismissed';

// PWA install prompt (FE-15): captures `beforeinstallprompt`, shows a
// dismissible banner (dismissal persisted in localStorage), and hides
// permanently once the app is installed (`appinstalled`).
export const InstallBanner = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      // Prevent the mini-infobar so we can show our own banner instead.
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    } catch {
      // Non-fatal: banner simply reappears next visit.
    }
  };

  return (
    <div
      role="region"
      aria-label={t('pwa.installTitle')}
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid var(--accent-amber)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.85rem 1rem',
        boxShadow: 'var(--shadow-md)',
        maxWidth: 'calc(100vw - 2rem)',
      }}
    >
      <img src="/logo.jpg" alt="" style={{ width: '38px', height: '38px', borderRadius: '8px' }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.9rem' }}>{t('pwa.installTitle')}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('pwa.installText')}</div>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={handleInstall}>
        <Download size={14} />
        <span>{t('pwa.install')}</span>
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleDismiss}
        aria-label={t('pwa.dismiss')}
        style={{ padding: '0.4rem 0.55rem' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
