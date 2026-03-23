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
  account: {
    // GET /api/v1/connected-accounts/status?userId={id}&platform={platform}
    status: '/api/v1/connected-accounts/status',
  },
  oauth: {
    // GET /api/v1/oauth/youtube/start?userId={id}  → { authUrl: string }
    youtubeStart: '/api/v1/oauth/youtube/start',
  },
  creator: {
    // POST /creator/retention/diagnosis
    retentionDiagnosis: '/creator/retention/diagnosis',
  },
}

export type EndpointKey = keyof typeof endpoints
