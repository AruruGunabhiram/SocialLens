export const endpoints = {
  youtube: {
    sync: '/youtube/sync',
  },
  channels: {
    list: '/channels',
    // Parameterized paths are built in api.ts: `/channels/${id}` etc.
  },
  analytics: {
    channel: '/analytics/channel',
    channelById: '/analytics/channel/by-id',
    videosById: '/analytics/videos/by-id',
    timeseriesById: '/analytics/timeseries/by-id',
    uploadFrequencyById: '/analytics/upload-frequency/by-id',
  },
  jobs: {
    // Adjust if backend path differs; kept centralized for easy updates.
    refreshChannel: '/jobs/refresh/channel',
  },
}

export type EndpointKey = keyof typeof endpoints
