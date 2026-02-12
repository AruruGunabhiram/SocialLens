import { z } from 'zod'

export const ChannelAnalyticsSchema = z.object({
  channelId: z.string(),
  title: z.string(),
  subscriberCount: z.number(),
  totalViews: z.number(),
  videoCount: z.number(),
})

export type ChannelAnalytics = z.infer<typeof ChannelAnalyticsSchema>
