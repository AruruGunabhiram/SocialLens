import { useQuery } from '@tanstack/react-query'
import { fetchAccountStatus, MVP_USER_ID } from './api'

/**
 * Polls the backend for the current user's YouTube connection status.
 * - staleTime: 60s  — avoid re-fetching on every render
 * - refetchInterval: 30s — detect newly-completed OAuth in the background
 * - retry: false — a connection error ≠ "user is not connected"; don't mask it
 */
export function useAccountStatus() {
  return useQuery({
    queryKey: ['account-status', MVP_USER_ID, 'YOUTUBE'],
    queryFn: () => fetchAccountStatus(MVP_USER_ID, 'YOUTUBE'),
    staleTime: 60_000,
    refetchInterval: 30_000,
    retry: false,
  })
}
