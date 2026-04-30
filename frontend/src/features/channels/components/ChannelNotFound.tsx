import { Link } from 'react-router-dom'
import { Tv2 } from 'lucide-react'

type Props = {
  channelId: string | number
}

export function ChannelNotFound({ channelId }: Props) {
  function focusSearch() {
    const el = document.querySelector<HTMLElement>('[data-search-input]')
    el?.focus()
  }

  return (
    <div
      className="flex flex-col items-center justify-center text-center py-16 px-6 space-y-6"
      role="status"
      aria-label={`Channel ${channelId} not found`}
    >
      <Tv2
        size={64}
        aria-hidden
        style={{ color: 'var(--color-text-muted)', strokeWidth: 1.25 }}
      />
      <div className="space-y-2">
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Channel #{channelId} not found
        </h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
          This channel isn&apos;t in SocialLens yet. Add it by searching above.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/channels"
          className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
        >
          ← Back to Channels
        </Link>
        <button
          type="button"
          onClick={focusSearch}
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: 'var(--accent)',
            color: 'var(--color-text-inverse)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + Track It
        </button>
      </div>
    </div>
  )
}
