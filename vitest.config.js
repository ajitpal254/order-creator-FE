import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest config (QOL-04). Kept separate from vite.config.js so the dev /
// production build is untouched. Tests run against a fixed, fake API origin
// that MSW intercepts — no real backend or network is ever contacted.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Generous timeouts: the suite renders full pages with user-event
    // typing and must stay green on slow/shared CI CPUs.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    env: {
      // src/api/client.js reads this at module load; MSW handlers are
      // registered for exactly this base (see src/test/handlers.js).
      VITE_API_URL: 'http://localhost:5000/api',
    },
  },
});
