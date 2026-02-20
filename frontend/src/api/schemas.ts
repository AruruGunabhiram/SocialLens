import { z } from 'zod'

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
