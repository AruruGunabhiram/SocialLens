import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { FreshnessBadge } from './FreshnessBadge'

type ChannelHeaderProps = {
  title?: string
  channelId?: string
  lastRefreshedAt?: string
}

export function ChannelHeader({ title, channelId, lastRefreshedAt }: ChannelHeaderProps) {
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
      <FreshnessBadge lastRefreshedAt={lastRefreshedAt} />
    </div>
  )
}
