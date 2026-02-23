import {
  keepPreviousData,
  useIsFetching,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'

import {
  fetchChannelAnalytics,
  fetchChannelAnalyticsById,
  fetchChannelById,
  fetchChannels,
  fetchChannelVideos,
  refreshChannelAnalytics,
  syncChannel,
  type VideoQueryParams,
} from './api'
import type { ChannelAnalytics } from './schemas'
import { toastError, toastSuccess } from '@/lib/toast'
import type { AppError } from '@/api/httpError'
import type { ChannelItem, VideosPageResponse, YouTubeSyncResponse } from '@/api/types'

// -----------------------------------------------------------------------
// Query keys for new channels + videos endpoints
// -----------------------------------------------------------------------

export const channelListQueryKeys = {
  root: ['channelList'] as const,
  list: (includeInactive: boolean) =>
    ['channelList', 'list', includeInactive] as const,
  detail: (id: number) => ['channelList', 'detail', id] as const,
  videos: (id: number, params: VideoQueryParams) =>
    ['channelList', 'videos', id, params] as const,
}

// -----------------------------------------------------------------------
// Channels list query  — GET /channels
// -----------------------------------------------------------------------

export function useChannelsQuery(includeInactive = false) {
  return useQuery<ChannelItem[], AppError>({
    queryKey: channelListQueryKeys.list(includeInactive),
    queryFn: () => fetchChannels(includeInactive),
    staleTime: 2 * 60 * 1000,
  })
}

// -----------------------------------------------------------------------
// Single channel query  — GET /channels/:id
// Used by Topbar for title / by ChannelOverviewPage for meta
// -----------------------------------------------------------------------

export function useChannelQuery(channelDbId?: number) {
  return useQuery<ChannelItem, AppError>({
    queryKey: channelListQueryKeys.detail(channelDbId ?? -1),
    queryFn: () => fetchChannelById(channelDbId!),
    enabled: Boolean(channelDbId),
    staleTime: 2 * 60 * 1000,
  })
}

// -----------------------------------------------------------------------
// Videos query  — GET /channels/:id/videos
// -----------------------------------------------------------------------

export function useVideosQuery(channelDbId: number, params: VideoQueryParams) {
  return useQuery<VideosPageResponse, AppError>({
    queryKey: channelListQueryKeys.videos(channelDbId, params),
    queryFn: () => fetchChannelVideos(channelDbId, params),
    enabled: Boolean(channelDbId),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  })
}

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
