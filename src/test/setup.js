import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';

// findBy*/waitFor get a longer window so slow renders don't flake.
configure({ asyncUtilTimeout: 10_000 });
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './server';

// Firebase must never initialise (or reach the network) in tests: the app
// only uses it for Google sign-in, which these suites do not exercise.
// Returning null auth/provider mirrors the real "not configured" deployment
// state that LoginPage already handles.
vi.mock('../firebase', () => ({
  auth: null,
  googleProvider: null,
  signInWithPopup: vi.fn(),
  isFirebaseConfigured: false,
}));

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
});

afterAll(() => {
  server.close();
});
