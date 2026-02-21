import {
  useIsFetching,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'

import { fetchChannelAnalytics, fetchChannelAnalyticsById, refreshChannelAnalytics, syncChannel } from './api'
import type { ChannelAnalytics } from './schemas'
import { toastError, toastSuccess } from '@/lib/toast'
import type { YouTubeSyncResponse } from '@/api/types'

export const channelQueryKeys = {
  root: ['channels'] as const,
  analytics: (channelId: string) => [...channelQueryKeys.root, 'analytics', channelId] as const,
  analyticsById: (channelDbId: number) => [...channelQueryKeys.root, 'analytics-by-id', channelDbId] as const,
}

// ==============================================
// Sync Channel Mutation (Load flow)
// ==============================================

export function useChannelSyncMutation() {
  return useMutation({
    mutationFn: (identifier: string) => syncChannel(identifier),
    onSuccess: (data) => {
      toastSuccess('Channel loaded', `Loaded channel: ${data.title || data.channelId}`)
    },
    onError: (error) => {
      toastError(error, 'Failed to load channel')
    },
  })
}

// ==============================================
// Analytics Queries - Old (using identifier)
// ==============================================

export function useChannelAnalyticsQuery(
  channelId?: string,
  options?: Omit<
    UseQueryOptions<ChannelAnalytics, unknown, ChannelAnalytics, ReturnType<typeof channelQueryKeys.analytics>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: channelQueryKeys.analytics(channelId || '__unset__'),
    queryFn: () => {
      if (!channelId) {
        return Promise.reject(new Error('channelId is required'))
      }
      return fetchChannelAnalytics(channelId)
    },
    enabled: Boolean(channelId),
    ...options,
  })
}

// ==============================================
// Analytics Queries - New (using channelDbId)
// ==============================================

export function useChannelAnalyticsByIdQuery(
  channelDbId?: number,
  options?: Omit<
    UseQueryOptions<ChannelAnalytics, unknown, ChannelAnalytics, ReturnType<typeof channelQueryKeys.analyticsById>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: channelQueryKeys.analyticsById(channelDbId ?? -1),
    queryFn: () => {
      if (!channelDbId) {
        return Promise.reject(new Error('channelDbId is required'))
      }
      return fetchChannelAnalyticsById(channelDbId)
    },
    enabled: Boolean(channelDbId),
    ...options,
  })
}

// ==============================================
// Refresh Mutation (legacy)
// ==============================================

export function useChannelRefreshMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (channelId: string) => refreshChannelAnalytics(channelId),
    onSuccess: (_data, channelId) => {
      toastSuccess('Refresh requested', 'Latest metrics will load when ready.')
      if (channelId) {
        queryClient.invalidateQueries({ queryKey: channelQueryKeys.analytics(channelId) })
      }
    },
    onError: (error) => {
      toastError(error, 'Failed to request refresh')
    },
  })
}

// ==============================================
// Refresh by DB ID
// ==============================================

export function useChannelRefreshByIdMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ channelDbId, channelId }: { channelDbId: number; channelId: string }) =>
      refreshChannelAnalytics(channelId),
    onSuccess: (_data, { channelDbId }) => {
      toastSuccess('Refresh requested', 'Latest metrics will load when ready.')
      queryClient.invalidateQueries({ queryKey: channelQueryKeys.analyticsById(channelDbId) })
    },
    onError: (error) => {
      toastError(error, 'Failed to request refresh')
    },
  })
}

// ==============================================
// Loading States
// ==============================================

export function useIsChannelFetching(channelId?: string) {
  return (
    useIsFetching({
      queryKey: channelQueryKeys.analytics(channelId || '__unset__'),
    }) > 0
  )
}

export function useIsChannelFetchingById(channelDbId?: number) {
  return (
    useIsFetching({
      queryKey: channelQueryKeys.analyticsById(channelDbId ?? -1),
    }) > 0
  )
}
