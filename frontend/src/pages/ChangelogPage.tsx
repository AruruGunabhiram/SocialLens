import { changelog } from '@/data/changelog'

function formatEntryDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const TAG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  NEW: {
    bg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    border: 'color-mix(in srgb, var(--accent) 30%, transparent)',
    text: 'var(--accent)',
  },
  IMPROVED: {
    bg: 'color-mix(in srgb, var(--color-up) 10%, transparent)',
    border: 'color-mix(in srgb, var(--color-up) 30%, transparent)',
    text: 'var(--color-up)',
  },
  FIX: {
    bg: 'color-mix(in srgb, var(--color-neutral) 10%, transparent)',
    border: 'color-mix(in srgb, var(--color-neutral) 30%, transparent)',
    text: 'var(--color-neutral)',
  },
}

export default function ChangelogPage() {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: 'var(--space-8) var(--space-6)',
      }}
    >
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: 'var(--tracking-tight)',
            lineHeight: 1.2,
          }}
        >
          Changelog
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            marginTop: 'var(--space-2)',
          }}
        >
          New features and improvements to SocialLens.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {changelog.map((entry, i) => {
          const tagStyle = TAG_COLORS[entry.tag] ?? TAG_COLORS.NEW
          const isLast = i === changelog.length - 1

          return (
            <div
              key={entry.version}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1px 1fr',
                gap: '0 var(--space-6)',
              }}
            >
              {/* Left: date + version */}
              <div
                style={{
                  paddingTop: 'var(--space-1)',
                  textAlign: 'right',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.4,
                  }}
                >
                  v{entry.version}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {formatEntryDate(entry.date)}
                </p>
              </div>

              {/* Center: timeline line + dot */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--accent)' : 'var(--color-border-base)',
                    border: i === 0 ? '2px solid var(--color-surface-0)' : 'none',
                    boxShadow: i === 0 ? '0 0 6px var(--accent)' : 'none',
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                {!isLast && (
                  <div
                    aria-hidden
                    style={{
                      flex: 1,
                      width: 1,
                      background: 'var(--color-border-subtle)',
                      minHeight: 'var(--space-8)',
                    }}
                  />
                )}
              </div>

              {/* Right: content card */}
              <div style={{ paddingBottom: isLast ? 0 : 'var(--space-8)' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: 'var(--tracking-wide)',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      lineHeight: 1,
                      background: tagStyle.bg,
                      border: `1px solid ${tagStyle.border}`,
                      color: tagStyle.text,
                    }}
                  >
                    {entry.tag}
                  </span>
                </div>

                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  {entry.items.map((item) => (
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
                          lineHeight: 1.6,
                        }}
                      >
                        ✦
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-secondary)',
                          lineHeight: 'var(--leading-relaxed)',
                        }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
