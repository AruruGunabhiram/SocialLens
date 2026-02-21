import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import { ChannelAnalyticsSchema, YouTubeSyncResponseSchema } from '@/api/schemas'
import type { ChannelAnalytics, YouTubeSyncResponse } from '@/api/types'

// ==============================================
// YouTube Sync - Load flow
// ==============================================

export async function syncChannel(identifier: string): Promise<YouTubeSyncResponse> {
  try {
    const { data } = await axiosClient.post(endpoints.youtube.sync, { identifier })
    return YouTubeSyncResponseSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

// ==============================================
// Analytics - Old endpoints (using identifier)
// ==============================================

export async function fetchChannelAnalytics(channelId: string): Promise<ChannelAnalytics> {
  try {
    const { data } = await axiosClient.get(endpoints.analytics.channel, {
      params: { identifier: channelId },
    })

    return ChannelAnalyticsSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

// ==============================================
// Analytics - New endpoints (using channelDbId)
// ==============================================

export async function fetchChannelAnalyticsById(channelDbId: number): Promise<ChannelAnalytics> {
  try {
    const { data } = await axiosClient.get(endpoints.analytics.channelById, {
      params: { channelDbId },
    })

    return ChannelAnalyticsSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

// ==============================================
// Refresh (legacy)
// ==============================================

export async function refreshChannelAnalytics(channelId: string) {
  try {
    const { data } = await axiosClient.post(endpoints.jobs.refreshChannel, { channelId })
    return data as { status?: string }
  } catch (error) {
    throw normalizeHttpError(error)
  }
}
