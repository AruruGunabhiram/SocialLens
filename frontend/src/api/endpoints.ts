export const endpoints = {
  youtube: {
    sync: '/api/v1/youtube/sync',
  },
  channels: {
    list: '/api/v1/channels',
    // Parameterized paths are built in api.ts: `/api/v1/channels/${id}` etc.
  },
  analytics: {
    channel: '/api/v1/analytics/channel',
    channelById: '/api/v1/analytics/channel/by-id',
    videosById: '/api/v1/analytics/videos/by-id',
    timeseriesById: '/api/v1/analytics/timeseries/by-id',
    uploadFrequencyById: '/api/v1/analytics/upload-frequency/by-id',
  },
  jobs: {
    // POST /api/v1/jobs/refresh/channel?channelDbId={id}
    refreshChannel: '/api/v1/jobs/refresh/channel',
    // POST /api/v1/jobs/daily-refresh/run
    dailyRefresh: '/api/v1/jobs/daily-refresh/run',
    // GET /api/v1/jobs/budget
    budget: '/api/v1/jobs/budget',
  },
  admin: {
    // POST /api/v1/admin/data/clear
    clearData: '/api/v1/admin/data/clear',
  },
  account: {
    // GET /api/v1/connected-accounts/status?userId={id}&platform={platform}
    status: '/api/v1/connected-accounts/status',
    // GET /api/v1/connected-accounts/detail?userId={id}&platform={platform}
    detail: '/api/v1/connected-accounts/detail',
    // POST /api/v1/connected-accounts/disconnect?userId={id}&platform={platform}
    disconnect: '/api/v1/connected-accounts/disconnect',
  },
  users: {
    // GET /api/v1/users/me  → { id, email, name } — returns/creates the local-dev user
    me: '/api/v1/users/me',
  },
  oauth: {
    // GET /api/v1/oauth/youtube/start?userId={id}  → { authUrl: string }
    youtubeStart: '/api/v1/oauth/youtube/start',
  },
  creator: {
    // POST /api/v1/creator/retention/diagnosis
    retentionDiagnosis: '/api/v1/creator/retention/diagnosis',
  },
}

export type EndpointKey = keyof typeof endpoints
