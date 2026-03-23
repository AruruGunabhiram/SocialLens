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
  /** Error message from the most recent failed refresh job; null when last job succeeded. */
  lastRefreshError: z.string().nullish(),
  lastSnapshotAt: z.string().nullish(),
  /** Total distinct snapshot days captured for this channel. */
  snapshotDayCount: z.number().nullish(),
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
    videosEnriched: z.number().optional(),
    enrichmentErrors: z.number().optional(),
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

// -----------------------------------------------------------------------
// Timeseries API — GET /analytics/timeseries/by-id
//
// Stable backend contract:
//   { channelDbId, channelId, metric, rangeDays, points: [{date, value}] }
//
// If the backend returns any other shape, Zod will throw.  The caller is
// responsible for catching that and surfacing "Unsupported response format"
// rather than raw Zod errors.
// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// Account status — GET /api/v1/connected-accounts/status
// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// Local user — GET /api/v1/users/me
// -----------------------------------------------------------------------

export const LocalUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
})

export const AccountStatusSchema = z.object({
  userId: z.number(),
  platform: z.string(),
  connected: z.boolean(),
  /** Present when an account row exists; mirrors ConnectedAccountStatus enum on the backend. */
  accountStatus: z.string().optional(),
})

export const OAuthStartResponseSchema = z.object({
  authUrl: z.string(),
})

// -----------------------------------------------------------------------
// Retention Diagnosis — POST /creator/retention/diagnosis
// -----------------------------------------------------------------------

export const RetentionDropEventSchema = z.object({
  startProgress: z.number(),
  endProgress: z.number(),
  dropMagnitude: z.number(),
  slope: z.number(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
})

export const DiagnosisItemSchema = z.object({
  label: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  evidence: z.string(),
  recommendation: z.string(),
})

export const RetentionDiagnosisResponseSchema = z.object({
  videoId: z.string(),
  summary: z.string(),
  dropEvents: z.array(RetentionDropEventSchema),
  diagnoses: z.array(DiagnosisItemSchema),
})

export const TimeSeriesPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  value: z.number(),
})

export const TimeSeriesResponseSchema = z
  .object({
    channelDbId: z.number().nullish(),
    channelId: z.string().nullish(),
    metric: z.string().nullish(),
    rangeDays: z.number().nullish(),
    points: z.array(TimeSeriesPointSchema),
  })
  .passthrough()
