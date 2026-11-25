import { apiRequest } from './client';

// Two-factor authentication endpoints (v0.4).
// Backend contract:
//  - POST /api/auth/2fa/verify  { challengeToken, code } -> normal session
//    response { success, token, user } (same shape as login).
//  - POST /api/auth/2fa/setup   (authenticated, staff only)
//    -> { success, secret, otpauthUri }
//  - POST /api/auth/2fa/enable  { code } -> { success, backupCodes: [...] }
//  - POST /api/auth/2fa/disable { code } -> { success }
export const twoFactorApi = {
  verify: ({ challengeToken, code }) =>
    apiRequest('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code }),
    }),
  setup: () =>
    apiRequest('/auth/2fa/setup', {
      method: 'POST',
    }),
  enable: ({ code }) =>
    apiRequest('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  disable: ({ code }) =>
    apiRequest('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

export default twoFactorApi;
