import { z } from 'zod'

import { ChannelAnalyticsSchema, ChannelMetricPointSchema } from './schemas'

export type ChannelAnalytics = z.infer<typeof ChannelAnalyticsSchema>
export type ChannelMetricPoint = z.infer<typeof ChannelMetricPointSchema>
