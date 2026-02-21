import { z } from 'zod'

// YouTube Sync Response from POST /youtube/sync
export const YouTubeSyncResponseSchema = z.object({
  identifier: z.string(),
  channelDbId: z.number(),
  channelId: z.string(),
  title: z.string().optional(),
  resolved: z.object({
    channelId: z.string(),
    resolvedFrom: z.string(),
    normalizedInput: z.string(),
  }),
  result: z.object({
    videosFetched: z.number(),
    videosSaved: z.number(),
    videosUpdated: z.number(),
    pagesFetched: z.number(),
    pageSize: z.number(),
  }),
  timing: z.object({
    startedAt: z.string(),
    finishedAt: z.string(),
    durationMs: z.number(),
  }),
  warnings: z.array(z.string()).optional(),
})

export const ChannelMetricPointSchema = z
  .object({
    date: z.string(),
    views: z.number().optional(),
    subscribers: z.number().optional(),
    likes: z.number().optional(),
    comments: z.number().optional(),
    uploads: z.number().optional(),
  })
  .passthrough()

export const ChannelAnalyticsSchema = z
  .object({
    channelId: z.string(),
    title: z.string().optional(),
    subscriberCount: z.number().optional(),
    totalViews: z.number().optional(),
    videoCount: z.number().optional(),
    likeCount: z.number().optional(),
    commentCount: z.number().optional(),
    lastRefreshedAt: z.string().optional(),
    lastUpdatedAt: z.string().optional(),
    refreshedAt: z.string().optional(),
    timeseries: z.array(ChannelMetricPointSchema).optional(),
  })
  .passthrough()
