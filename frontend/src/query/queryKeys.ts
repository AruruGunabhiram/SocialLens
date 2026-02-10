export const queryKeys = {
  analytics: {
    channel: (channelId: string) => ['analytics', 'channel', channelId] as const,
  },
}
