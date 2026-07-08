import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      // Retrying network errors while offline is pointless and delays the UI
      // from falling back to cached/offline state — cap retries low.
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
