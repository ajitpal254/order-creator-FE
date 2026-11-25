import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  canApproveOrders,
  companiesApi,
  companyKeys,
  getCompanyId,
  normalizeMyCompanies,
  unwrapData,
} from '../api/companies';

// Companies + approvals data hooks (v0.9 F3), following the TanStack
// Query pattern of useAddresses/useBuyerDashboard: reads unwrap the
// { success, data } envelope, mutations invalidate the company keys.

export function useMyCompanies() {
  return useQuery({
    queryKey: companyKeys.mine,
    queryFn: async () => normalizeMyCompanies(await companiesApi.getMine()),
  });
}

export function useCompany(id) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const data = unwrapData(await companiesApi.getById(id));
      return data && typeof data === 'object' ? data : null;
    },
  });
}

export function useCompanyOrders(id) {
  return useQuery({
    queryKey: companyKeys.orders(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const data = unwrapData(await companiesApi.getOrders(id));
      return Array.isArray(data) ? data : [];
    },
  });
}

function useCompanyMutation(mutationFn, extraKeys = []) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      extraKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
  });
}

export function useCreateCompany() {
  return useCompanyMutation((name) => companiesApi.create(name));
}

export function useUpdateCompany() {
  return useCompanyMutation(({ id, patch }) => companiesApi.update(id, patch));
}

export function useAddCompanyMember() {
  return useCompanyMutation(({ id, email, role }) =>
    companiesApi.addMember(id, { email, role })
  );
}

export function useUpdateCompanyMember() {
  return useCompanyMutation(({ id, userId, role }) =>
    companiesApi.updateMember(id, userId, { role })
  );
}

export function useRemoveCompanyMember() {
  return useCompanyMutation(({ id, userId }) =>
    companiesApi.removeMember(id, userId)
  );
}

// Approve / reject a company order awaiting approval. Invalidates the
// company order lists AND the buyer's own order lists, since the order's
// approvalStatus changes for its buyer too.
export function useApproveOrder() {
  return useCompanyMutation((orderId) => companiesApi.approveOrder(orderId), [
    ['orders'],
  ]);
}

export function useRejectOrder() {
  return useCompanyMutation(
    ({ orderId, reason }) => companiesApi.rejectOrder(orderId, reason),
    [['orders']]
  );
}

// Approval queue across every company the caller can approve for:
// [{ company, role, order }] for orders with approvalStatus 'pending'.
// Companies the caller cannot approve for are never queried.
export function usePendingCompanyApprovals() {
  const mine = useMyCompanies();
  const entries = (mine.data || []).filter((entry) =>
    canApproveOrders(entry.role)
  );

  const orderQueries = useQueries({
    queries: entries.map((entry) => ({
      queryKey: companyKeys.orders(getCompanyId(entry.company)),
      queryFn: async () => {
        const data = unwrapData(
          await companiesApi.getOrders(getCompanyId(entry.company))
        );
        return Array.isArray(data) ? data : [];
      },
    })),
  });

  const pending = [];
  entries.forEach((entry, i) => {
    const orders = orderQueries[i]?.data || [];
    orders
      .filter((order) => order.approvalStatus === 'pending')
      .forEach((order) => pending.push({ ...entry, order }));
  });

  return {
    pending,
    isLoading: mine.isLoading || orderQueries.some((q) => q.isLoading),
    isError: mine.isError,
  };
}
