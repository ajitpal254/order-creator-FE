import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

// EN / हिंदी toggle (FE-15). Switching persists via the languageChanged
// handler in src/i18n/index.js (localStorage 'hao-language').
export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const current = i18n.language === 'hi' ? 'hi' : 'en';

  const buttonStyle = (active) => ({
    border: 'none',
    background: active ? 'var(--accent-amber)' : 'transparent',
    color: active ? '#090D16' : 'var(--text-secondary)',
    fontWeight: 700,
    fontSize: '0.75rem',
    padding: '0.25rem 0.55rem',
    borderRadius: '999px',
    cursor: 'pointer',
  });

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        border: '1px solid var(--border-subtle)',
        borderRadius: '999px',
        padding: '2px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
      }}
    >
      <Globe size={14} color="var(--text-muted)" style={{ marginLeft: '4px' }} />
      <button
        type="button"
        aria-pressed={current === 'en'}
        onClick={() => i18n.changeLanguage('en')}
        style={buttonStyle(current === 'en')}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={current === 'hi'}
        onClick={() => i18n.changeLanguage('hi')}
        style={buttonStyle(current === 'hi')}
      >
        हिंदी
      </button>
    </div>
  );
};
