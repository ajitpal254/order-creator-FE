import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Shared MSW server for the whole suite. Started once in setup.js with
// onUnhandledRequest: 'error' so a test can never silently hit the network.
export const server = setupServer(...handlers);
