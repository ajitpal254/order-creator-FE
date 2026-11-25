import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../api/client';

// Stable query keys for order data (FE-07).
export const orderKeys = {
  all: ['orders'],
  my: ['orders', 'my'],
};

// The signed-in buyer's orders. Reuses the existing api client unchanged;
// unwraps the { success, data } envelope exactly as the page did before.
// Invoice totals etc. come straight from this API response, untouched —
// this hook only changes how the data is fetched/cached.
export function useMyOrders() {
  return useQuery({
    queryKey: orderKeys.my,
    queryFn: async () => {
      const res = await orderApi.getMyOrders();
      return res?.success ? res.data : [];
    },
  });
}

// Invalidation helper for anything that changes the buyer's order list
// (e.g. creating an order elsewhere): call the returned function after a
// successful mutation and the My Orders list refetches, as it did when the
// page fetched on mount. MyOrdersPage itself has no list-changing mutation
// — its only action is the PDF blob download, which does not alter list
// data and therefore does not invalidate.
export function useInvalidateMyOrders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: orderKeys.my });
}
