import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  clearAllData,
  disconnectAccount,
  fetchAccountDetail,
  fetchAccountStatus,
  fetchBudgetStatus,
  fetchCurrentUser,
} from './api'
import { toastError, toastSuccess } from '@/lib/toast'

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

/** Full connected account details — channelId, scopes, expiry, created date. */
export function useAccountDetail(userId: number | undefined) {
  return useQuery({
    queryKey: ['account-detail', userId, 'YOUTUBE'],
    queryFn: () => fetchAccountDetail(userId!, 'YOUTUBE'),
    enabled: userId !== undefined,
    staleTime: 60_000,
    retry: false,
  })
}

/** Daily YouTube API quota usage. */
export function useBudgetStatus() {
  return useQuery({
    queryKey: ['jobs-budget'],
    queryFn: fetchBudgetStatus,
    staleTime: 30_000,
    retry: false,
  })
}

/** Marks the YouTube account as disconnected and clears stored tokens. */
export function useDisconnectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId }: { userId: number }) => disconnectAccount(userId, 'YOUTUBE'),
    onSuccess: (_data, { userId }) => {
      toastSuccess('Disconnected', 'Your YouTube account has been disconnected.')
      queryClient.invalidateQueries({ queryKey: ['account-status', userId, 'YOUTUBE'] })
      queryClient.invalidateQueries({ queryKey: ['account-detail', userId, 'YOUTUBE'] })
    },
    onError: (error) => {
      toastError(error, 'Failed to disconnect account')
    },
  })
}

/** Clears all stored analytics snapshots and indexed videos. */
export function useClearDataMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: clearAllData,
    onSuccess: (result) => {
      const total = (result.videosDeleted ?? 0) + (result.channelSnapshotsDeleted ?? 0)
      toastSuccess(
        'Data cleared',
        `Removed ${total.toLocaleString()} records. Channel list is unchanged.`
      )
      // Invalidate all data queries so the UI reflects the empty state
      queryClient.invalidateQueries()
    },
    onError: (error) => {
      toastError(error, 'Failed to clear data')
    },
  })
}
