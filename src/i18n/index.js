// i18n initialisation (FE-15). Imported first by src/main.jsx and by the
// test setup so the app and the test suite share exactly one configured
// i18next instance.
//
// Language resolution: the persisted choice in localStorage
// ('hao-language') wins; otherwise English. 'en' is also the fallback for
// any missing key, and it is the default in the test environment (jsdom
// localStorage starts empty), so existing English assertions keep passing.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en.js';
import { hi } from './hi.js';

export const LANGUAGE_STORAGE_KEY = 'hao-language';
export const SUPPORTED_LANGUAGES = ['en', 'hi'];

export function getStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

// Keep <html lang> in step with the active language for a11y / SEO.
const syncDocumentLang = (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
};
syncDocumentLang(i18n.language);
i18n.on('languageChanged', (lng) => {
  syncDocumentLang(lng);
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // Storage unavailable (private mode): language still switches for
    // the session, it just is not persisted.
  }
});

export default i18n;
