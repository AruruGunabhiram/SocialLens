import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { FreshnessBadge, type RefreshStatus } from './FreshnessBadge'

type ChannelHeaderProps = {
  title?: string
  channelId?: string
  /** ISO-8601 string from GET /channels/:id — lastSuccessfulRefreshAt */
  lastSuccessfulRefreshAt?: string | null
  /** ISO-8601 string from GET /channels/:id — lastSnapshotAt */
  lastSnapshotAt?: string | null
  /** Enum value from GET /channels/:id — lastRefreshStatus */
  lastRefreshStatus?: RefreshStatus | string | null
}

export function ChannelHeader({
  title,
  channelId,
  lastSuccessfulRefreshAt,
  lastSnapshotAt,
  lastRefreshStatus,
}: ChannelHeaderProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-card/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Channel</p>
          <h1 className="text-2xl font-semibold leading-tight">{title || 'Channel overview'}</h1>
        </div>
        {channelId && <Badge variant="outline">ID: {channelId}</Badge>}
      </div>
      <Separator />
      <FreshnessBadge
        lastSuccessfulRefreshAt={lastSuccessfulRefreshAt}
        lastSnapshotAt={lastSnapshotAt}
        lastRefreshStatus={lastRefreshStatus}
      />
    </div>
  )
}
