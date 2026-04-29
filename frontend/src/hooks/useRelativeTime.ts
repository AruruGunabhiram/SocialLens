import { useState, useEffect } from 'react'
import { formatRelativeTime } from '@/utils/formatters'

export function useRelativeTime(dateStr: string | undefined): string {
  const [display, setDisplay] = useState(
    dateStr ? formatRelativeTime(dateStr) : '—'
  )

  useEffect(() => {
    if (!dateStr) return

    const update = () => setDisplay(formatRelativeTime(dateStr))
    update()

    const age = Date.now() - new Date(dateStr).getTime()
    const interval =
      age < 60_000 ? 10_000 :
      age < 3_600_000 ? 30_000 :
      age < 86_400_000 ? 300_000 :
      3_600_000

    const timer = setInterval(update, interval)
    return () => clearInterval(timer)
  }, [dateStr])

  return display
}
