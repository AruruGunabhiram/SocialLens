export const endpoints = {
  analytics: {
    channel: '/analytics/channel',
  },
  jobs: {
    // Adjust if backend path differs; kept centralized for easy updates.
    refreshChannel: '/jobs/refresh/channel',
  },
}

export type EndpointKey = keyof typeof endpoints
