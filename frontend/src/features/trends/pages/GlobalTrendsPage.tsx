import { TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

function GlobalTrendsPage() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '60vh', gap: 'var(--space-4)' }}
    >
      <TrendingUp size={40} style={{ color: 'var(--color-text-muted)' }} aria-hidden />
      <div className="text-center" style={{ maxWidth: 420 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Trends
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Cross-channel trend comparison and growth velocity will appear here. Open a channel to
          view its individual trend analysis.
        </p>
        <Link
          to="/channels"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--accent)',
            textDecoration: 'none',
          }}
        >
          Browse channels
        </Link>
      </div>
    </div>
  )
}

export default GlobalTrendsPage
