import { z } from 'zod'

import { ChannelAnalyticsSchema, ChannelMetricPointSchema, YouTubeSyncResponseSchema } from './schemas'

export type YouTubeSyncResponse = z.infer<typeof YouTubeSyncResponseSchema>
export type ChannelAnalytics = z.infer<typeof ChannelAnalyticsSchema>
export type ChannelMetricPoint = z.infer<typeof ChannelMetricPointSchema>
