import { Link } from 'react-router-dom'
import { CURRENT_VERSION } from '@/data/changelog'

export function AppFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface-0)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          padding: '0 var(--space-6)',
          minHeight: 48,
        }}
      >
        {/* LEFT: copyright + version */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          &copy; 2026 SocialLens
          <span aria-hidden style={{ opacity: 0.4 }}>
            &middot;
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--color-text-muted)',
              opacity: 0.7,
            }}
          >
            v{CURRENT_VERSION}-beta
          </span>
        </span>

        {/* CENTER: nav links + status */}
        <nav
          aria-label="Footer navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link
            to="/docs"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              transition: 'color var(--duration-fast) var(--ease-standard)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            Docs
          </Link>

          <Link
            to="/changelog"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              transition: 'color var(--duration-fast) var(--ease-standard)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            Changelog
          </Link>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--color-up)',
                flexShrink: 0,
                boxShadow: '0 0 4px var(--color-up)',
              }}
            />
            Operational
          </span>
        </nav>

        {/* RIGHT: stack attribution */}
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            opacity: 0.6,
            whiteSpace: 'nowrap',
          }}
        >
          Powered by YouTube Data API v3
        </span>
      </div>
    </footer>
  )
}
