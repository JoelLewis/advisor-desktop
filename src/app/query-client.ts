import { QueryClient } from '@tanstack/react-query'

/** The app's query client. Tests that exercise caching across viewer switches use this same configuration. */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } } })
}
