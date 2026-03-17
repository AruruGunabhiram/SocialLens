import { Search } from 'lucide-react'

export function Topbar() {
  return (
    <header
      className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 px-6"
      style={{
        height: 'var(--header-height)',
        background: 'var(--color-surface-0)',
        borderBottom: '1px solid var(--color-border-subtle)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* LEFT: Logo mark + product name + version pill */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Logo mark: three ascending bars curving into a C */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden
          style={{ color: 'var(--color-text-primary)', flexShrink: 0 }}
        >
          <rect x="4" y="18" width="4" height="7" rx="1" fill="currentColor" opacity="0.45" />
          <rect x="10" y="11" width="4" height="14" rx="1" fill="currentColor" opacity="0.7" />
          <rect x="16" y="5" width="4" height="20" rx="1" fill="currentColor" />
          <path
            d="M20 5 C24 5 24 9 24 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: 'var(--tracking-wide)',
          }}
        >
          SOCIALLENS
        </span>

        <span
          className="num"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          BETA
        </span>
      </div>

      {/* CENTER: Channel search bar (static shell) */}
      <div className="flex flex-1 justify-center">
        <div
          className="flex items-center gap-2"
          style={{
            width: '480px',
            maxWidth: '100%',
            height: '36px',
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-full)',
            padding: '0 var(--space-4)',
          }}
          role="search"
          aria-label="Channel search"
        >
          <Search
            size={16}
            aria-hidden
            style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
          />
          <span
            style={{
              flex: 1,
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
            }}
          >
            Search any YouTube channel...
          </span>
        </div>
      </div>

      {/* RIGHT: Explorer mode badge */}
      <div className="flex shrink-0 items-center gap-3">
        <div
          className="flex items-center gap-2"
          style={{
            background: 'var(--color-amber-glow)',
            border: '1px solid color-mix(in srgb, var(--color-amber-500) 40%, transparent)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 10px',
          }}
          aria-label="Explorer mode active"
        >
          <span
            className="animate-pulse-dot"
            aria-hidden
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-amber-500)',
              flexShrink: 0,
            }}
          />
          <span
            className="num"
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              letterSpacing: 'var(--tracking-widest)',
              color: 'var(--color-amber-500)',
            }}
          >
            EXPLORING
          </span>
        </div>
      </div>
    </header>
  )
}
