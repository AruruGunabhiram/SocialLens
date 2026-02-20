import {
  useIsFetching,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'

import { fetchChannelAnalytics, refreshChannelAnalytics } from './api'
import type { ChannelAnalytics } from './schemas'
import { toastError, toastSuccess } from '@/lib/toast'

export const channelQueryKeys = {
  root: ['channels'] as const,
  analytics: (channelId: string) => [...channelQueryKeys.root, 'analytics', channelId] as const,
}

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

export function useIsChannelFetching(channelId?: string) {
  return (
    useIsFetching({
      queryKey: channelQueryKeys.analytics(channelId || '__unset__'),
    }) > 0
  )
}
