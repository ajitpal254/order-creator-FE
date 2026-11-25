// Full-page redirect to an external URL (e.g. a payment gateway's
// hosted checkout). Kept as its own tiny module so callers stay simple
// and tests can mock this one function instead of fighting jsdom's
// read-only window.location.
export const redirectTo = (url) => {
  window.location.assign(url);
};
