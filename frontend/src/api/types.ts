import { z } from 'zod'

import {
  ChannelAnalyticsSchema,
  ChannelItemSchema,
  ChannelMetricPointSchema,
  PageMetaSchema,
  TimeSeriesPointSchema,
  TimeSeriesResponseSchema,
  VideoRowSchema,
  VideosPageResponseSchema,
  YouTubeSyncResponseSchema,
} from './schemas'

export type YouTubeSyncResponse = z.infer<typeof YouTubeSyncResponseSchema>
export type ChannelAnalytics = z.infer<typeof ChannelAnalyticsSchema>
export type ChannelMetricPoint = z.infer<typeof ChannelMetricPointSchema>
export type ChannelItem = z.infer<typeof ChannelItemSchema>
export type VideoRow = z.infer<typeof VideoRowSchema>
export type PageMeta = z.infer<typeof PageMetaSchema>
export type VideosPageResponse = z.infer<typeof VideosPageResponseSchema>
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>
export type TimeSeriesResponse = z.infer<typeof TimeSeriesResponseSchema>
