import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { useChannelSyncMutation } from '@/features/channels/queries'
import { useMode } from '@/lib/ModeContext'
import { useAccountStatus } from '@/features/account/queries'

export function Topbar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const sync = useChannelSyncMutation()
  const { mode } = useMode()
  const { data: accountStatus } = useAccountStatus()

  const connected = accountStatus?.connected ?? false

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || sync.isPending) return
    sync.mutate(trimmed, {
      onSuccess: (data) => {
        setQuery('')
        navigate(`/channels/${data.channelDbId}`)
      },
    })
  }

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

      {/* CENTER: Channel search + Load */}
      <div className="flex flex-1 justify-center">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2"
          style={{ width: '520px', maxWidth: '100%' }}
        >
          <label
            className="flex flex-1 items-center gap-2"
            style={{
              height: '36px',
              background: 'var(--color-surface-1)',
              border: `1px solid ${sync.isError ? 'var(--color-down)' : 'var(--color-border-base)'}`,
              borderRadius: 'var(--radius-full)',
              padding: '0 var(--space-4)',
              cursor: 'text',
            }}
          >
            {sync.isPending ? (
              <Loader2
                size={16}
                aria-hidden
                className="animate-spin"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              />
            ) : (
              <Search
                size={16}
                aria-hidden
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              />
            )}
            <input
              type="search"
              aria-label="Search channels"
              placeholder="@handle, channel ID, or URL..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={sync.isPending}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={!query.trim() || sync.isPending}
            style={{
              height: '36px',
              padding: '0 var(--space-4)',
              flexShrink: 0,
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              background: query.trim() && !sync.isPending ? 'var(--accent)' : 'var(--color-surface-2)',
              color: query.trim() && !sync.isPending ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
              border: '1px solid transparent',
              cursor: query.trim() && !sync.isPending ? 'pointer' : 'default',
              transition: `background var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard)`,
            }}
          >
            {sync.isPending ? 'Loading...' : 'Load'}
          </button>
        </form>
      </div>

      {/* RIGHT: Mode + connection badge */}
      <div className="flex shrink-0 items-center gap-2">
        {mode === 'studio' ? (
          <div
            className="flex items-center gap-2"
            style={{
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 10px',
            }}
            aria-label="Studio mode active"
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent)',
                flexShrink: 0,
              }}
            />
            <span
              className="num"
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                letterSpacing: 'var(--tracking-widest)',
                color: 'var(--accent)',
              }}
            >
              STUDIO
            </span>
          </div>
        ) : connected ? (
          <div
            className="flex items-center gap-2"
            style={{
              background: 'color-mix(in srgb, var(--color-up) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-up) 35%, transparent)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 10px',
            }}
            aria-label="YouTube account connected"
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-up)',
                flexShrink: 0,
              }}
            />
            <span
              className="num"
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                letterSpacing: 'var(--tracking-widest)',
                color: 'var(--color-up)',
              }}
            >
              CONNECTED
            </span>
          </div>
        ) : (
          <div
            className="flex items-center gap-2"
            style={{
              background: 'var(--color-amber-glow)',
              border: '1px solid color-mix(in srgb, var(--color-amber-500) 40%, transparent)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 10px',
            }}
            aria-label="Public mode — no account connected"
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
              PUBLIC
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
