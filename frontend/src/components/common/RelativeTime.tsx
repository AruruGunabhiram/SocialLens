import { useRelativeTime } from '@/hooks/useRelativeTime'

interface RelativeTimeProps {
  date: string | undefined
  prefix?: string
  className?: string
}

export function RelativeTime({ date, prefix, className }: RelativeTimeProps) {
  const relative = useRelativeTime(date)
  return (
    <time
      dateTime={date}
      title={date ? new Date(date).toLocaleString() : undefined}
      className={className}
    >
      {prefix ? `${prefix} ${relative}` : relative}
    </time>
  )
}
