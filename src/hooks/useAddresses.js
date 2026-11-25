import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressesApi, addressKeys } from '../api/addresses';

// Saved-address data hooks (v0.5 F3), following the same TanStack Query
// pattern as useOrders/useBuyerDashboard: reads unwrap the
// { success, data } envelope, mutations invalidate the list key so the
// settings manager and any other consumer refetch fresh data.

// The signed-in user's saved addresses (both bill-to and ship-to).
export function useAddresses() {
  return useQuery({
    queryKey: addressKeys.list,
    queryFn: async () => {
      const res = await addressesApi.list();
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.addresses)) return res.addresses;
      return [];
    },
  });
}

function useAddressMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.all });
    },
  });
}

export function useCreateAddress() {
  return useAddressMutation((address) => addressesApi.create(address));
}

export function useUpdateAddress() {
  return useAddressMutation(({ id, address }) => addressesApi.update(id, address));
}

export function useDeleteAddress() {
  return useAddressMutation((id) => addressesApi.remove(id));
}
