import { apiRequest } from './client';

// Companies + order approvals API (v0.9 F3).
// Backend contract:
//   POST   /api/companies                              { name } -> created company
//   GET    /api/companies/mine                         -> [{ company, role }]
//   GET    /api/companies/:id                          -> company detail
//   PATCH  /api/companies/:id                          { name, spendLimit, creditTerms }
//   POST   /api/companies/:id/members                  { email, role }
//   PATCH  /api/companies/:id/members/:userId          { role }
//   DELETE /api/companies/:id/members/:userId
//   GET    /api/companies/:id/orders                   -> company orders
//   POST   /api/orders/:id/approve
//   POST   /api/orders/:id/reject-approval             { reason }
// Responses are the shared { success, data } envelope. An order's
// `company` field may be an id or a populated object, and its
// approvalStatus is 'none' | 'pending' | 'approved' | 'rejected'.
export const companiesApi = {
  create: (name) =>
    apiRequest('/companies', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  getMine: () => apiRequest('/companies/mine'),
  getById: (id) => apiRequest(`/companies/${id}`),
  update: (id, patch) =>
    apiRequest(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  addMember: (id, { email, role }) =>
    apiRequest(`/companies/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  updateMember: (id, userId, { role }) =>
    apiRequest(`/companies/${id}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  removeMember: (id, userId) =>
    apiRequest(`/companies/${id}/members/${userId}`, {
      method: 'DELETE',
    }),
  getOrders: (id) => apiRequest(`/companies/${id}/orders`),
  approveOrder: (orderId) =>
    apiRequest(`/orders/${orderId}/approve`, { method: 'POST' }),
  rejectOrder: (orderId, reason) =>
    apiRequest(`/orders/${orderId}/reject-approval`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export const companyKeys = {
  all: ['companies'],
  mine: ['companies', 'mine'],
  detail: (id) => ['companies', 'detail', id],
  orders: (id) => ['companies', 'orders', id],
};

// Roles are rendered as whatever string the API returns; behaviour is
// gated only on these well-known values and degrades gracefully
// (read-only) for anything else.
export const COMPANY_ROLES = ['member', 'approver', 'admin', 'owner'];

export const canManageCompany = (role) => role === 'owner' || role === 'admin';
export const canEditCompanyFinances = (role) => role === 'owner';
export const canApproveOrders = (role) =>
  role === 'owner' || role === 'admin' || role === 'approver';

export const getCompanyId = (company) =>
  typeof company === 'string'
    ? company
    : company?._id || company?.id || null;

export const getCompanyName = (company) =>
  typeof company === 'string' ? company : company?.name || 'Company';

// Unwrap a { success, data } envelope (or a bare payload) to its data.
export const unwrapData = (res) => res?.data ?? res;

// Normalise GET /companies/mine into [{ company, role }] with `company`
// always an object, whatever shape the entry arrived in.
export const normalizeMyCompanies = (res) => {
  const list = unwrapData(res);
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      if (entry.company && typeof entry.company === 'object') {
        return { company: entry.company, role: entry.role || '' };
      }
      if (typeof entry.company === 'string') {
        return {
          company: { _id: entry.company, name: entry.companyName || 'Company' },
          role: entry.role || '',
        };
      }
      // The entry itself is the company.
      return { company: entry, role: entry.role || entry.myRole || '' };
    })
    .filter((entry) => entry && getCompanyId(entry.company));
};

// Normalise a company's members into [{ userId, email, name, role }].
// A member's `user` may be a populated object or a bare id.
export const getCompanyMembers = (company) => {
  const members = company?.members;
  if (!Array.isArray(members)) return [];
  return members
    .map((member) => {
      if (!member || typeof member !== 'object') return null;
      const user = member.user ?? member.userId ?? member._id;
      const userId =
        typeof user === 'string' ? user : user?._id || user?.id || null;
      return {
        userId,
        email: (typeof user === 'object' && user?.email) || member.email || '',
        name:
          (typeof user === 'object' && (user?.customerName || user?.name)) ||
          member.name ||
          '',
        role: member.role || 'member',
      };
    })
    .filter((member) => member && member.userId);
};

// An order's company name when populated, else null.
export const getOrderCompanyName = (order) =>
  order?.company && typeof order.company === 'object'
    ? order.company.name || null
    : null;
