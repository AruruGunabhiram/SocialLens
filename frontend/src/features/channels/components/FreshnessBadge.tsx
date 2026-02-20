import {
  differenceInHours,
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from 'date-fns'

import { Badge } from '@/components/ui/badge'

type FreshnessBadgeProps = {
  lastRefreshedAt?: string
}

function parseTimestamp(value?: string) {
  if (!value) return null
  const parsed = parseISO(value)
  if (isValid(parsed)) return parsed
  const fallback = new Date(value)
  return isValid(fallback) ? fallback : null
}

export function FreshnessBadge({ lastRefreshedAt }: FreshnessBadgeProps) {
  const parsed = parseTimestamp(lastRefreshedAt)

  if (!parsed) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">Unknown</Badge>
        <span>Last refreshed time unavailable</span>
      </div>
    )
  }

  const hoursSince = differenceInHours(new Date(), parsed)
  const isStale = hoursSince >= 24

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant={isStale ? 'destructive' : 'secondary'}>
        {isStale ? 'Stale' : 'Fresh'}
      </Badge>
      <span>Last refreshed {format(parsed, 'PPP p')}</span>
      <span className="text-xs text-muted-foreground/80">
        ({formatDistanceToNow(parsed, { addSuffix: true })})
      </span>
    </div>
  )
}
