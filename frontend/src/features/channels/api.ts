import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import {
  ChannelAnalyticsSchema,
  ChannelItemSchema,
  VideosPageResponseSchema,
  YouTubeSyncResponseSchema,
} from '@/api/schemas'
import type {
  ChannelAnalytics,
  ChannelItem,
  VideosPageResponse,
  YouTubeSyncResponse,
} from '@/api/types'

// -----------------------------------------------------------------------
// VideoQueryParams - params for GET /channels/:id/videos
// -----------------------------------------------------------------------

export type VideoQueryParams = {
  q?: string
  sort: string
  dir: string
  page: number
  size: number
}

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
// Channels list/detail — GET /channels
// ==============================================

export async function fetchChannels(includeInactive = false): Promise<ChannelItem[]> {
  try {
    const { data } = await axiosClient.get(endpoints.channels.list, {
      params: includeInactive ? { includeInactive: true } : undefined,
    })
    return ChannelItemSchema.array().parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

export async function fetchChannelById(channelDbId: number): Promise<ChannelItem> {
  try {
    const { data } = await axiosClient.get(`/channels/${channelDbId}`)
    return ChannelItemSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

// ==============================================
// Videos — GET /channels/:id/videos
// ==============================================

export async function fetchChannelVideos(
  channelDbId: number,
  params: VideoQueryParams
): Promise<VideosPageResponse> {
  try {
    const { data } = await axiosClient.get(`/channels/${channelDbId}/videos`, { params })
    return VideosPageResponseSchema.parse(data)
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
