import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, BarChart2, Lightbulb, MessageSquare } from 'lucide-react'

const SUGGESTIONS: { label: string; href: string; Icon: React.FC<{ size?: number }> }[] = [
  { label: 'Channels', href: '/channels', Icon: BarChart2 },
  { label: 'Insights', href: '/insights', Icon: Lightbulb },
  { label: 'Copilot', href: '/copilot', Icon: MessageSquare },
]

function NotFoundPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center text-center"
      style={{ padding: 'var(--space-12) var(--space-6)', maxWidth: 520, margin: '0 auto' }}
    >
      {/* Decorative "404" — not a heading, purely visual */}
      <div
        aria-hidden
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9rem',
          fontWeight: 700,
          lineHeight: 1,
          color: 'var(--color-text-muted)',
          opacity: 0.35,
          letterSpacing: '-0.05em',
          userSelect: 'none',
          marginBottom: 'var(--space-4)',
        }}
      >
        404
      </div>

      {/* Heading */}
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          lineHeight: 'var(--leading-tight)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Page not found
      </h1>

      {/* URL context */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          lineHeight: 'var(--leading-relaxed)',
          marginBottom: 'var(--space-8)',
        }}
      >
        The URL{' '}
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-sm)',
            padding: '1px 6px',
            wordBreak: 'break-all',
          }}
        >
          {pathname}
        </code>{' '}
        doesn't exist.
      </p>

      {/* Suggestions */}
      <div style={{ marginBottom: 'var(--space-8)', width: '100%' }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            letterSpacing: 'var(--tracking-widest)',
            textTransform: 'uppercase',
            marginBottom: 'var(--space-3)',
          }}
        >
          You might be looking for
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {SUGGESTIONS.map(({ label, href, Icon }) => (
            <Link
              key={href}
              to={href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-base)',
                background: 'var(--color-surface-1)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                transition: 'border-color var(--duration-base), color var(--duration-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                e.currentTarget.style.color = 'var(--color-text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-base)'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }}
            >
              <Icon size={14} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/channels"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-5)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            border: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-inverse)',
            textDecoration: 'none',
            transition: 'opacity var(--duration-base) var(--ease-standard)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <ArrowLeft size={14} aria-hidden />
          Back to Channels
        </Link>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-5)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-base)',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'border-color var(--duration-base), color var(--duration-base)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-strong)'
            e.currentTarget.style.color = 'var(--color-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-base)'
            e.currentTarget.style.color = 'var(--color-text-secondary)'
          }}
        >
          <ArrowLeft size={14} aria-hidden />
          Go Back
        </button>
      </div>
    </div>
  )
}

export default NotFoundPage
