import { useQuery } from '@tanstack/react-query'
import { fetchAccountStatus, fetchCurrentUser } from './api'

/**
 * Resolves the implicit local-dev user from the backend.
 * This replaces the old MVP_USER_ID=1 hardcode: the backend returns whichever
 * id was actually assigned, creating the user if none exists yet.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    staleTime: Infinity, // the local-dev user never changes during a session
    retry: 2,
  })
}

/**
 * Polls the backend for the current user's YouTube connection status.
 * Disabled until the current user is known so we never send userId=undefined.
 * - staleTime: 60s  — avoid re-fetching on every render
 * - refetchInterval: 30s — detect newly-completed OAuth in the background
 * - retry: false — a connection error ≠ "user is not connected"; don't mask it
 */
export function useAccountStatus(userId: number | undefined) {
  return useQuery({
    queryKey: ['account-status', userId, 'YOUTUBE'],
    queryFn: () => fetchAccountStatus(userId!, 'YOUTUBE'),
    enabled: userId !== undefined,
    staleTime: 60_000,
    refetchInterval: 30_000,
    retry: false,
  })
}
