import { QueryClient } from "@tanstack/react-query";

// Lab data is static per deploy, so refetching on focus only costs bandwidth.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

export default queryClient;
