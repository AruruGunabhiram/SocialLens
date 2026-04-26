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
  fetchChannelTimeSeries,
  fetchChannelVideos,
  refreshChannelById,
  syncChannel,
  type RefreshChannelResult,
  type TrendMetric,
  type VideoQueryParams,
} from './api'
import type { ChannelAnalytics } from './schemas'
import { useDemoMode } from '@/lib/DemoModeContext'
import {
  demoChannels,
  demoAnalytics,
  getDemoVideos,
  type DemoChannelId,
} from '@/data/demoData'
import {
  toastDismiss,
  toastError,
  toastInfo,
  toastLoading,
  toastSuccess,
  toastWarning,
} from '@/lib/toast'
import { isAppError, type AppError } from '@/api/httpError'
import type { ChannelItem, TimeSeriesResponse, VideosPageResponse } from '@/api/types'

// -----------------------------------------------------------------------
// Query keys for new channels + videos endpoints
// -----------------------------------------------------------------------

export const channelListQueryKeys = {
  root: ['channelList'] as const,
  list: (includeInactive: boolean) => ['channelList', 'list', includeInactive] as const,
  detail: (id: number) => ['channelList', 'detail', id] as const,
  videos: (id: number, params: VideoQueryParams) => ['channelList', 'videos', id, params] as const,
}

// -----------------------------------------------------------------------
// Channels list query   -  GET /channels
// -----------------------------------------------------------------------

export function useChannelsQuery(includeInactive = false) {
  const { isDemoMode } = useDemoMode()
  return useQuery<ChannelItem[], AppError>({
    queryKey: isDemoMode ? ['demo', 'channels'] : channelListQueryKeys.list(includeInactive),
    queryFn: isDemoMode ? () => Promise.resolve(demoChannels) : () => fetchChannels(includeInactive),
    staleTime: 2 * 60 * 1000,
  })
}

// -----------------------------------------------------------------------
// Single channel query   -  GET /channels/:id
// Used by Topbar for title / by ChannelOverviewPage for meta
// -----------------------------------------------------------------------

export function useChannelQuery(channelDbId?: number) {
  const { isDemoMode } = useDemoMode()
  const demoChannel = isDemoMode
    ? demoChannels.find((c) => c.id === channelDbId) ?? null
    : null
  return useQuery<ChannelItem, AppError>({
    queryKey: isDemoMode ? ['demo', 'channel', channelDbId] : channelListQueryKeys.detail(channelDbId ?? -1),
    queryFn: demoChannel
      ? () => Promise.resolve(demoChannel)
      : () => fetchChannelById(channelDbId!),
    enabled: isDemoMode ? Boolean(demoChannel) : Boolean(channelDbId),
    staleTime: 2 * 60 * 1000,
  })
}

// -----------------------------------------------------------------------
// Videos query   -  GET /channels/:id/videos
// -----------------------------------------------------------------------

export function useVideosQuery(channelDbId: number, params: VideoQueryParams) {
  const { isDemoMode } = useDemoMode()
  return useQuery<VideosPageResponse, AppError>({
    queryKey: isDemoMode
      ? ['demo', 'videos', channelDbId, params]
      : channelListQueryKeys.videos(channelDbId, params),
    queryFn: isDemoMode
      ? () => Promise.resolve(getDemoVideos(channelDbId, params.page, params.size, params.sort, params.dir, params.q))
      : () => fetchChannelVideos(channelDbId, params),
    enabled: isDemoMode ? true : Boolean(channelDbId),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  })
}

export const channelQueryKeys = {
  root: ['channels'] as const,
  analytics: (channelId: string) => [...channelQueryKeys.root, 'analytics', channelId] as const,
  analyticsById: (channelDbId: number) =>
    [...channelQueryKeys.root, 'analytics-by-id', channelDbId] as const,
}

// -----------------------------------------------------------------------
// Timeseries query keys + hook
// -----------------------------------------------------------------------

export const trendQueryKeys = {
  root: ['trends'] as const,
  timeseries: (channelDbId: number, metric: TrendMetric) =>
    ['trends', 'timeseries', channelDbId, metric] as const,
}

export function useChannelTimeSeries(channelDbId?: number, metric: TrendMetric = 'VIEWS') {
  return useQuery<TimeSeriesResponse, AppError>({
    queryKey: trendQueryKeys.timeseries(channelDbId ?? -1, metric),
    queryFn: () => fetchChannelTimeSeries(channelDbId!, metric),
    enabled: Boolean(channelDbId),
    staleTime: 2 * 60 * 1000,
  })
}

// ==============================================
// Sync Channel Mutation (Load flow)
// ==============================================

export function useChannelSyncMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (identifier: string) => syncChannel(identifier),
    onMutate: () => {
      const toastId = toastLoading('Looking up channel...')
      return { toastId }
    },
    onSuccess: (data, _vars, context) => {
      toastDismiss(context?.toastId)
      toastSuccess('Channel loaded', `Loaded channel: ${data.title || data.channelId}`)
      // Invalidate the channel list so the new channel appears immediately on /channels
      queryClient.invalidateQueries({ queryKey: channelListQueryKeys.root })
      // Also wipe analytics and timeseries for this channel so re-loads (e.g. after
      // a DB reset) never serve data from a stale cache for the same numeric ID.
      queryClient.invalidateQueries({ queryKey: channelQueryKeys.root })
      queryClient.invalidateQueries({ queryKey: ['timeseries', data.channelDbId] })
    },
    onError: (error, _vars, context) => {
      toastDismiss(context?.toastId)
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
    UseQueryOptions<
      ChannelAnalytics,
      unknown,
      ChannelAnalytics,
      ReturnType<typeof channelQueryKeys.analytics>
    >,
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
    UseQueryOptions<
      ChannelAnalytics,
      unknown,
      ChannelAnalytics,
      ReturnType<typeof channelQueryKeys.analyticsById>
    >,
    'queryKey' | 'queryFn'
  >
) {
  const { isDemoMode } = useDemoMode()
  const demoEntry = isDemoMode && channelDbId != null
    ? (demoAnalytics[channelDbId as DemoChannelId] ?? null)
    : null
  return useQuery({
    queryKey: isDemoMode
      ? ['demo', 'analytics', channelDbId]
      : channelQueryKeys.analyticsById(channelDbId ?? -1),
    queryFn: demoEntry
      ? () => Promise.resolve(demoEntry)
      : () => {
          if (!channelDbId) return Promise.reject(new Error('channelDbId is required'))
          return fetchChannelAnalyticsById(channelDbId)
        },
    enabled: isDemoMode ? Boolean(demoEntry) : Boolean(channelDbId),
    ...options,
  })
}

// ==============================================
// Refresh by DB ID   -  calls POST /api/v1/jobs/refresh/channel?channelDbId=
// This is the ONLY refresh hook. Always uses channelDbId as the query param.
// ==============================================

export function useChannelRefreshByIdMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    RefreshChannelResult,
    unknown,
    { channelDbId: number },
    { toastId: string | number }
  >({
    mutationFn: ({ channelDbId }) => refreshChannelById(channelDbId),
    onMutate: () => {
      const toastId = toastLoading('Syncing channel data...')
      return { toastId }
    },
    onSuccess: (data, { channelDbId }, context) => {
      toastDismiss(context?.toastId)
      const enriched = data.videosEnriched ?? null
      const errors = data.enrichmentErrors ?? 0
      const isPartial = errors > 0 || data.outcomeStatus === 'PARTIAL'

      if (isPartial) {
        // Enrichment had batch failures  -  snapshot and channel data are fresh, but some
        // videos may still be missing titles/thumbnails.
        const description =
          enriched !== null
            ? `${enriched} video(s) enriched. ${errors} API batch(es) failed  -  some titles/thumbnails may be missing.`
            : `${errors} enrichment batch(es) failed  -  some video metadata may be incomplete.`
        toastWarning('Partial refresh', description)
      } else {
        const description =
          enriched !== null
            ? `${enriched} video(s) enriched with full metadata. Snapshot written.`
            : 'Snapshot written  -  chart data is ready.'
        toastSuccess('Refresh complete', description)
      }

      // Invalidate all downstream queries so UI reflects updated data.
      queryClient.invalidateQueries({ queryKey: channelQueryKeys.root })
      queryClient.invalidateQueries({ queryKey: channelListQueryKeys.detail(channelDbId) })
      queryClient.invalidateQueries({ queryKey: channelListQueryKeys.list(false) })
      queryClient.invalidateQueries({ queryKey: channelListQueryKeys.list(true) })
      queryClient.invalidateQueries({ queryKey: ['channelList', 'videos', channelDbId] })
      queryClient.invalidateQueries({ queryKey: ['timeseries', channelDbId] })
    },
    onError: (error, _vars, context) => {
      toastDismiss(context?.toastId)
      // 409 = refresh already running; not an error worth alarming the user.
      if (isAppError(error) && error.status === 409) {
        toastInfo('Refresh already in progress', 'This channel is currently being refreshed.')
        return
      }
      toastError(error, 'Failed to trigger refresh')
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
