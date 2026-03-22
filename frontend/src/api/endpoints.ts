export const endpoints = {
  youtube: {
    sync: '/api/v1/youtube/sync',
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
    // POST /api/v1/jobs/refresh/channel?channelDbId={id}
    refreshChannel: '/api/v1/jobs/refresh/channel',
  },
}

export type EndpointKey = keyof typeof endpoints
