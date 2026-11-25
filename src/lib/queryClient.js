import { QueryClient } from '@tanstack/react-query';

// Shared TanStack Query client (FE-07).
// Conservative SPA defaults: data is considered fresh for 30s so navigating
// back to a list doesn't refetch instantly, one automatic retry on failure,
// and no surprise refetches when the window regains focus.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
