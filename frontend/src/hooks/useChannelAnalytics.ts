import { useQuery } from '@tanstack/react-query'
import { fetchChannelAnalytics } from '@/api/analytics.api'
import { queryKeys } from '@/query/queryKeys'

const DEFAULT_STALE_TIME = 60 * 1000

export function useChannelAnalytics(channelId?: string) {
  return useQuery({
    queryKey: channelId ? queryKeys.analytics.channel(channelId) : ['analytics', 'channel'],
    queryFn: () => {
      if (!channelId) {
        return Promise.reject(new Error('channelId is required'))
      }
      return fetchChannelAnalytics(channelId)
    },
    enabled: Boolean(channelId),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_STALE_TIME * 2,
  })
}
