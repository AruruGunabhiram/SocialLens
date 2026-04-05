import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Loader2, Search, Settings, Youtube } from 'lucide-react'
import type { AppError } from '@/api/httpError'
import { fetchOAuthStartUrl } from '@/features/account/api'
import { useAccountStatus, useCurrentUser } from '@/features/account/queries'
import { useChannelSyncMutation } from '@/features/channels/queries'

// ─── ConnectedDropdown ────────────────────────────────────────────────────────

function ConnectedDropdown({
  userName,
  userEmail,
  onClose,
}: {
  userName?: string
  userEmail?: string
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + var(--space-2))',
        right: 0,
        width: 220,
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        zIndex: 50,
      }}
      role="menu"
    >
      {/* Account identity */}
      {(userName || userEmail) && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          {userName && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                lineHeight: 1.3,
              }}
            >
              {userName}
            </p>
          )}
          {userEmail && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                marginTop: '2px',
                lineHeight: 1.3,
              }}
            >
              {userEmail}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: 'var(--space-1)' }}>
        <Link
          to="/settings"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            transition: 'background var(--duration-fast) var(--ease-standard)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-2)'
            e.currentTarget.style.color = 'var(--color-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-secondary)'
          }}
          role="menuitem"
        >
          <Settings size={13} aria-hidden style={{ flexShrink: 0 }} />
          Manage connection
        </Link>

        <button
          type="button"
          disabled
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            cursor: 'not-allowed',
            textAlign: 'left',
            opacity: 0.5,
          }}
          role="menuitem"
        >
          <Youtube size={13} aria-hidden style={{ flexShrink: 0 }} />
          Disconnect
        </button>
      </div>
    </div>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isStartingOAuth, setIsStartingOAuth] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const sync = useChannelSyncMutation()
  const { data: currentUser } = useCurrentUser()
  const { data: accountStatus } = useAccountStatus(currentUser?.id)

  const connected = accountStatus?.connected ?? false

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropdownOpen])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || sync.isPending) return
    sync.mutate(trimmed, {
      onSuccess: (data) => {
        setQuery('')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
        navigate(`/channels/${data.channelDbId}`)
      },
    })
  }

  async function handleConnect() {
    if (!currentUser) return
    setIsStartingOAuth(true)
    try {
      const authUrl = await fetchOAuthStartUrl(currentUser.id)
      window.open(authUrl, '_blank', 'noopener,noreferrer')
    } catch {
      // silently fail — the sidebar shows the full error state
    } finally {
      setIsStartingOAuth(false)
    }
  }

  const errorMessage: string | null = sync.isError
    ? (sync.error as AppError)?.status === 404
      ? 'Channel not found — check the handle or URL and try again'
      : ((sync.error as AppError)?.message ?? 'Failed to load channel')
    : null

  // Derive input border color
  const inputBorderColor = sync.isError
    ? 'var(--color-down)'
    : focused
      ? 'var(--accent)'
      : 'var(--color-border-base)'

  const hasQuery = Boolean(query.trim())

  return (
    <header
      className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 px-5"
      style={{
        height: 'var(--header-height)',
        background: 'var(--color-surface-0)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* LEFT: Logo — visible on mobile only; sidebar handles desktop */}
      <div className="flex shrink-0 items-center gap-2 lg:hidden">
        <Link
          to="/channels"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            textDecoration: 'none',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden
            style={{ color: 'var(--accent)', flexShrink: 0 }}
          >
            <rect x="4" y="18" width="4" height="7" rx="1" fill="currentColor" opacity="0.4" />
            <rect x="10" y="11" width="4" height="14" rx="1" fill="currentColor" opacity="0.65" />
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
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
            }}
          >
            SocialLens
          </span>
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '9px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 5px',
            letterSpacing: 'var(--tracking-wide)',
            lineHeight: 1,
          }}
        >
          BETA
        </span>
      </div>

      {/* CENTER: Channel track form */}
      <div className="flex flex-1 justify-center" style={{ position: 'relative' }}>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2"
          style={{ width: 480, maxWidth: '100%' }}
        >
          {/* Input */}
          <label
            className="flex flex-1 items-center gap-2"
            style={{
              height: 36,
              background: 'var(--color-surface-1)',
              border: `1px solid ${inputBorderColor}`,
              borderRadius: 'var(--radius-full)',
              padding: '0 var(--space-4)',
              cursor: 'text',
              transition: 'border-color var(--duration-base) var(--ease-standard)',
            }}
          >
            {sync.isPending ? (
              <Loader2
                size={14}
                aria-hidden
                className="animate-spin"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              />
            ) : (
              <Search
                size={14}
                aria-hidden
                style={{
                  color: focused ? 'var(--accent)' : 'var(--color-text-muted)',
                  flexShrink: 0,
                  transition: 'color var(--duration-base) var(--ease-standard)',
                }}
              />
            )}
            <input
              type="search"
              aria-label="Track a YouTube channel"
              placeholder="@handle, channel ID, or URL..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (sync.isError) sync.reset()
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
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

          {/* Submit button */}
          <button
            type="submit"
            disabled={!hasQuery || sync.isPending || showSuccess}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              height: 36,
              padding: '0 var(--space-4)',
              flexShrink: 0,
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              background: showSuccess
                ? 'color-mix(in srgb, var(--color-up) 15%, var(--color-surface-2))'
                : hasQuery && !sync.isPending
                  ? 'var(--accent)'
                  : 'var(--color-surface-2)',
              color: showSuccess
                ? 'var(--color-up)'
                : hasQuery && !sync.isPending
                  ? 'var(--color-text-inverse)'
                  : 'var(--color-text-muted)',
              border: showSuccess
                ? '1px solid color-mix(in srgb, var(--color-up) 30%, transparent)'
                : '1px solid transparent',
              cursor: hasQuery && !sync.isPending && !showSuccess ? 'pointer' : 'default',
              transition:
                'background var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard)',
              whiteSpace: 'nowrap',
            }}
          >
            {sync.isPending ? (
              <Loader2 size={13} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
            ) : showSuccess ? (
              <Check size={13} aria-hidden style={{ flexShrink: 0 }} />
            ) : (
              <Youtube size={13} aria-hidden style={{ flexShrink: 0 }} />
            )}
            {sync.isPending ? 'Loading...' : showSuccess ? 'Tracked' : 'Track Channel'}
          </button>
        </form>

        {/* Inline error — floats below form, doesn't affect header height */}
        {errorMessage && (
          <p
            style={{
              position: 'absolute',
              top: 'calc(100% + var(--space-1))',
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-down)',
              background: 'color-mix(in srgb, var(--color-down) 8%, var(--color-surface-1))',
              border: '1px solid color-mix(in srgb, var(--color-down) 25%, transparent)',
              borderRadius: 'var(--radius-md)',
              padding: '3px var(--space-3)',
              whiteSpace: 'nowrap',
              zIndex: 10,
              pointerEvents: 'none',
            }}
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>

      {/* RIGHT: Connection status */}
      <div className="flex shrink-0 items-center gap-2">
        {connected ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                height: 32,
                padding: '0 var(--space-3)',
                background: dropdownOpen
                  ? 'var(--color-surface-2)'
                  : 'color-mix(in srgb, var(--color-up) 10%, transparent)',
                border: `1px solid ${dropdownOpen ? 'var(--color-border-base)' : 'color-mix(in srgb, var(--color-up) 30%, transparent)'}`,
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                transition:
                  'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard)',
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
                  boxShadow: '0 0 5px var(--color-up)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  color: 'var(--color-up)',
                  letterSpacing: 'var(--tracking-wide)',
                }}
              >
                Connected
              </span>
              <ChevronDown
                size={11}
                aria-hidden
                style={{
                  color: 'var(--color-up)',
                  flexShrink: 0,
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform var(--duration-base) var(--ease-standard)',
                }}
              />
            </button>

            {dropdownOpen && (
              <ConnectedDropdown
                userName={currentUser?.name}
                userEmail={currentUser?.email}
                onClose={() => setDropdownOpen(false)}
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={isStartingOAuth}
            onClick={() => void handleConnect()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              height: 32,
              padding: '0 var(--space-3)',
              background: 'var(--color-amber-glow)',
              border: '1px solid color-mix(in srgb, var(--color-amber-500) 40%, transparent)',
              borderRadius: 'var(--radius-full)',
              cursor: isStartingOAuth ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-amber-500)',
              transition: 'opacity var(--duration-base) var(--ease-standard)',
              opacity: isStartingOAuth ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isStartingOAuth ? (
              <Loader2 size={12} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
            ) : (
              <Youtube size={12} aria-hidden style={{ flexShrink: 0 }} />
            )}
            Connect YouTube
          </button>
        )}
      </div>
    </header>
  )
}
