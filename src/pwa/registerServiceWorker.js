// Service worker registration (FE-15). Production builds only — the dev
// server and the test suite never register /public/sw.js. The caching
// rules live in public/sw.js itself.
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA is an enhancement: a failed registration must never break
      // the app, so failures are swallowed deliberately.
    });
  });
}
