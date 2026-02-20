import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import { ChannelAnalyticsSchema } from '@/api/schemas'
import type { ChannelAnalytics } from '@/api/types'

export async function fetchChannelAnalytics(channelId: string): Promise<ChannelAnalytics> {
  try {
    const { data } = await axiosClient.get(endpoints.analytics.channel, {
      params: { channelId },
    })

    return ChannelAnalyticsSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

export async function refreshChannelAnalytics(channelId: string) {
  try {
    const { data } = await axiosClient.post(endpoints.jobs.refreshChannel, { channelId })
    return data as { status?: string }
  } catch (error) {
    throw normalizeHttpError(error)
  }
}
