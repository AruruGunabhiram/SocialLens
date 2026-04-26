import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { changelog, CURRENT_VERSION } from '@/data/changelog'

const SEEN_KEY = 'sl_changelog_seen'

function formatEntryDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function loadSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, CURRENT_VERSION)
  } catch {
    // ignore
  }
}

export function ChangelogBadge() {
  const [open, setOpen] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHasNew(loadSeenVersion() !== CURRENT_VERSION)
  }, [])

  useEffect(() => {
    if (!open) return
    markSeen()
    setHasNew(false)

    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const latest = changelog[0]
  const prev = changelog[1]

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          fontWeight: 700,
          color: 'var(--color-neutral)',
          background: open
            ? 'color-mix(in srgb, var(--color-neutral) 15%, transparent)'
            : 'color-mix(in srgb, var(--color-neutral) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-neutral) 25%, transparent)',
          borderRadius: 'var(--radius-full)',
          padding: '2px 6px',
          letterSpacing: 'var(--tracking-wide)',
          lineHeight: 1,
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'background var(--duration-fast) var(--ease-standard)',
          whiteSpace: 'nowrap',
        }}
      >
        BETA v{CURRENT_VERSION}
      </button>

      {/* Notification dot */}
      {hasNew && (
        <span
          aria-label="New version available"
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--color-accent-blue, #3b82f6)',
            border: '1.5px solid var(--color-surface-0)',
            flexShrink: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Popover */}
      {open && (
        <div
          role="dialog"
          aria-label="What's new"
          style={{
            position: 'absolute',
            top: 'calc(100% + var(--space-2))',
            left: 0,
            width: 280,
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            zIndex: 60,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                lineHeight: 1.2,
              }}
            >
              What&rsquo;s New in v{latest.version}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                marginTop: 2,
              }}
            >
              {formatEntryDate(latest.date)}
            </p>
          </div>

          {/* Latest items */}
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 'var(--space-3) var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}
          >
            {latest.items.map((item) => (
              <li
                key={item}
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    flexShrink: 0,
                    lineHeight: 1.5,
                  }}
                >
                  ✦
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>

          {/* Footer: prev version + see all */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-2) var(--space-4)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              v{prev.version} &middot; {formatShortDate(prev.date)}
            </span>
            <Link
              to="/changelog"
              onClick={() => setOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--accent)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              See all &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
