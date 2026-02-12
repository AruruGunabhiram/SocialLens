import { axiosClient, normalizeAxiosError } from './axiosClient'
import { ChannelAnalyticsSchema, type ChannelAnalytics } from '@/schemas/analytics.schema'

export async function fetchChannelAnalytics(channelId: string): Promise<ChannelAnalytics> {
  try {
    const response = await axiosClient.get('/analytics/channel', {
      params: { channelId },
    })

    const parsed = ChannelAnalyticsSchema.safeParse(response.data)
    if (!parsed.success) {
      throw new Error('Invalid analytics data received')
    }

    return parsed.data
  } catch (error) {
    throw normalizeAxiosError(error)
  }
}
