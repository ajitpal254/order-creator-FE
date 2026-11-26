import { apiRequest } from './client';

// Order templates API (FE-12). Built on the exported apiRequest so
// auth/refresh behaviour is identical to the rest of the app.
// Backend contract (exact):
//   GET    /api/templates                    -> { success, data: [...] }
//   POST   /api/templates                    -> saves the current order
//                                               draft payload under a name
//   DELETE /api/templates/:id
//   POST   /api/templates/:id/create-order   -> creates an order from the
//                                               template; response carries
//                                               the created order
export const templatesApi = {
  list: () => apiRequest('/templates'),
  create: (payload) =>
    apiRequest('/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  remove: (id) => apiRequest(`/templates/${id}`, { method: 'DELETE' }),
  createOrder: (id) =>
    apiRequest(`/templates/${id}/create-order`, { method: 'POST' }),
};

// Unwrap the created order from a create-order response, tolerating the
// envelope spellings used across this API ({ order } / { data } / bare).
export const orderFromTemplateResponse = (res) => {
  const candidate = res?.order || res?.data || res;
  return candidate && typeof candidate === 'object' ? candidate : null;
};
