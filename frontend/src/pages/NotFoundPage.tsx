import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          letterSpacing: 'var(--tracking-widest)',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        404
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        The page you are looking for does not exist.
      </p>
      <Link
        to="/channels"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--accent)',
          textDecoration: 'none',
        }}
      >
        Go to Channels
      </Link>
    </div>
  )
}

export default NotFoundPage
