import { z } from 'zod'

// -----------------------------------------------------------------------
// Channels API — GET /channels, GET /channels/:id
// -----------------------------------------------------------------------

export const RefreshStatusSchema = z.enum(['NEVER_RUN', 'SUCCESS', 'FAILED', 'PARTIAL'])

export const ChannelItemSchema = z.object({
  id: z.number(),
  title: z.string().nullish(),
  handle: z.string().nullish(),
  channelId: z.string(),
  active: z.boolean(),
  description: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
  country: z.string().nullish(),
  publishedAt: z.string().nullish(),
  lastSuccessfulRefreshAt: z.string().nullish(),
  lastRefreshStatus: RefreshStatusSchema.nullish(),
  lastSnapshotAt: z.string().nullish(),
  subscriberCount: z.number().nullish(),
  viewCount: z.number().nullish(),
  videoCount: z.number().nullish(),
})

// -----------------------------------------------------------------------
// Videos API — GET /channels/:id/videos
// -----------------------------------------------------------------------

export const VideoRowSchema = z.object({
  id: z.number(),
  videoId: z.string(),
  title: z.string().nullish(),
  publishedAt: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
  viewCount: z.number().nullish(),
  likeCount: z.number().nullish(),
  commentCount: z.number().nullish(),
})

export const PageMetaSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
})

export const VideosPageResponseSchema = z.object({
  items: z.array(VideoRowSchema),
  page: PageMetaSchema,
})

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
