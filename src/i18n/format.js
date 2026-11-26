// Locale-aware formatting helpers (FE-15). The locale is derived from the
// active i18next language, so dates/numbers re-render in the chosen
// language's conventions whenever the language switches.
import i18n from './index.js';

export function activeLocale() {
  return i18n.language === 'hi' ? 'hi-IN' : 'en-US';
}

export function formatDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(activeLocale(), options).format(date);
}

export function formatDateTime(value) {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(activeLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatNumber(value, options) {
  if (value == null || Number.isNaN(Number(value))) return '';
  return new Intl.NumberFormat(activeLocale(), options).format(value);
}
