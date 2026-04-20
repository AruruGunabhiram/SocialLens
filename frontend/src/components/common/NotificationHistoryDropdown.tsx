import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import {
  getNotifications,
  subscribeNotifications,
  type NotificationEntry,
  type NotifType,
} from '@/lib/notificationHistory'

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

const TYPE_CONFIG: Record<NotifType, { color: string; Icon: typeof CheckCircle2 }> = {
  success: { color: 'var(--color-up)', Icon: CheckCircle2 },
  error: { color: 'var(--color-down)', Icon: XCircle },
  warning: { color: 'var(--color-amber-500)', Icon: AlertTriangle },
  info: { color: 'var(--color-neutral)', Icon: Info },
}

export function NotificationHistoryDropdown() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<NotificationEntry[]>(getNotifications)
  const [hasUnread, setHasUnread] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(
    () =>
      subscribeNotifications(() => {
        setEntries(getNotifications())
        setHasUnread(true)
      }),
    []
  )

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  // Alt+T opens the panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key === 't') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleOpen() {
    setOpen((o) => !o)
    setHasUnread(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications alt+T"
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          background: open ? 'var(--color-surface-2)' : 'transparent',
          border: `1px solid ${open ? 'var(--color-border-base)' : 'transparent'}`,
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          transition:
            'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'var(--color-surface-2)'
            e.currentTarget.style.color = 'var(--color-text-primary)'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-muted)'
          }
        }}
      >
        <Bell size={15} aria-hidden />
        {hasUnread && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent)',
              border: '1.5px solid var(--color-surface-0)',
            }}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Recent activity"
          style={{
            position: 'absolute',
            top: 'calc(100% + var(--space-2))',
            right: 0,
            width: 300,
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
              }}
            >
              Recent Activity
            </span>
          </div>

          {entries.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-6) var(--space-4)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                No recent activity
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 'var(--space-1)' }}>
              {entries.map((entry) => {
                const { color, Icon } = TYPE_CONFIG[entry.type]
                return (
                  <li
                    key={entry.id}
                    role="menuitem"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <Icon size={14} aria-hidden style={{ color, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)',
                          lineHeight: 'var(--leading-snug)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.message}
                      </p>
                      {entry.description && (
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                            lineHeight: 'var(--leading-relaxed)',
                            margin: '2px 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        flexShrink: 0,
                        marginTop: 3,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {relativeTime(entry.timestamp)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
