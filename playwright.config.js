import { defineConfig } from '@playwright/test';

// Playwright smoke config (QOL-04). Deliberately NOT wired into `npm test`
// (that runs the Vitest suite). Run manually against a live stack:
//
//   1. Start the backend (default http://127.0.0.1:5000) and this frontend:
//        npm run dev            # http://localhost:5173
//   2. npx playwright install chromium   (first time only)
//   3. npx playwright test
//
// webServer is intentionally left manual per the v0.3 brief.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
});
