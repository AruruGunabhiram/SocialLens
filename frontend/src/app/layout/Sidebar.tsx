import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Globe, Grid2X2, Loader2, RefreshCw } from 'lucide-react'
import { useMode } from '@/lib/ModeContext'
import { useAccountStatus, useCurrentUser } from '@/features/account/queries'
import { fetchOAuthStartUrl } from '@/features/account/api'

// ─── AccountConnectionCard ────────────────────────────────────────────────────
//
// Shows the current YouTube connection state and explains what each mode means.
// Three visible states:
//   1. loading  — query in-flight or error (fallback to "public mode" copy)
//   2. connected = false  — public mode, with a Connect button
//   3. connected = true   — connected, with Enter Studio button
//
// The OAuth flow opens a new tab. After the user completes sign-in, the
// backend stores the token; refetchInterval:30s picks up the change silently.
//
// NOTE: MVP_USER_ID=1 is hardcoded because the backend has no auth middleware
// yet. This will be replaced when real auth is added.

function AccountConnectionCard() {
  const { mode, setMode } = useMode()
  const { data: currentUser } = useCurrentUser()
  const { data: status, isLoading, isError, refetch } = useAccountStatus(currentUser?.id)
  const [isStartingOAuth, setIsStartingOAuth] = useState(false)
  const [oauthOpened, setOauthOpened] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const connected = status?.connected ?? false
  const accountStatus = status?.accountStatus
  // Account exists but token is broken — show reconnect UI instead of the
  // first-time connect UI.
  const needsReconnect =
    !connected && (accountStatus === 'REFRESH_FAILED' || accountStatus === 'EXPIRED')

  async function handleConnect() {
    if (!currentUser) {
      setConnectError('Could not resolve your account. Try refreshing the page.')
      return
    }
    setConnectError(null)
    setIsStartingOAuth(true)
    try {
      const authUrl = await fetchOAuthStartUrl(currentUser.id)
      window.open(authUrl, '_blank', 'noopener,noreferrer')
      setOauthOpened(true)
    } catch {
      setConnectError('Could not start sign-in. Check your connection.')
    } finally {
      setIsStartingOAuth(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface-1)',
    border: '1px solid var(--color-border-base)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
  }

  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-1)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  }

  const bodyStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-secondary)',
    lineHeight: 'var(--leading-relaxed)',
    marginBottom: 'var(--space-3)',
  }

  const primaryBtnStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--accent)',
    color: 'var(--color-text-inverse)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    transition: 'opacity var(--duration-base) var(--ease-standard)',
  }

  const secondaryBtnStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 500,
    border: '1px solid var(--color-border-base)',
    borderRadius: 'var(--radius-md)',
    padding: 'calc(var(--space-2) - 1px) var(--space-3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    transition: 'border-color var(--duration-base) var(--ease-standard)',
  }

  const fineStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    lineHeight: 'var(--leading-relaxed)',
    marginTop: 'var(--space-2)',
  }

  // ── Loading / error — don't block the sidebar, show public-mode copy ──────
  if (isLoading) {
    return (
      <div style={cardStyle}>
        <p style={headingStyle}>
          <Globe size={14} aria-hidden style={{ flexShrink: 0 }} />
          Public Mode
        </p>
        <p style={{ ...bodyStyle, opacity: 0.5 }}>Checking connection status...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div style={cardStyle}>
        <p style={headingStyle}>
          <Globe size={14} aria-hidden style={{ flexShrink: 0 }} />
          Public Mode
        </p>
        <p style={bodyStyle}>Could not reach the server to check account status.</p>
        <button
          type="button"
          style={secondaryBtnStyle}
          onClick={() => void refetch()}
        >
          <RefreshCw size={12} aria-hidden />
          Retry
        </button>
      </div>
    )
  }

  // ── Not connected — explain public mode and offer OAuth ───────────────────
  // Also handles the reconnect case (token expired or refresh failed).
  if (!connected) {
    return (
      <div
        style={{
          ...cardStyle,
          ...(needsReconnect
            ? { borderColor: 'color-mix(in srgb, var(--color-down) 35%, var(--color-border-base))' }
            : {}),
        }}
      >
        <p style={headingStyle}>
          {needsReconnect ? (
            <AlertTriangle
              size={14}
              aria-hidden
              style={{ color: 'var(--color-down)', flexShrink: 0 }}
            />
          ) : (
            <Globe size={14} aria-hidden style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          )}
          {needsReconnect ? 'Reconnect Required' : 'Public Mode'}
        </p>
        <p style={bodyStyle}>
          {needsReconnect
            ? 'Your YouTube token expired or could not be refreshed. Re-connect to restore Analytics access.'
            : 'Tracking public channel data via YouTube Data API. Trends are snapshot-based — captured each time you run a refresh.'}
        </p>

        {oauthOpened ? (
          <div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                lineHeight: 'var(--leading-relaxed)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Sign-in window opened. Complete the flow, then check your status.
            </p>
            <button
              type="button"
              style={secondaryBtnStyle}
              onClick={() => void refetch()}
            >
              <RefreshCw size={12} aria-hidden />
              Check connection status
            </button>
            <button
              type="button"
              style={{ ...secondaryBtnStyle, marginTop: 'var(--space-2)', opacity: 0.7 }}
              onClick={() => {
                setOauthOpened(false)
                setConnectError(null)
              }}
            >
              Back
            </button>
          </div>
        ) : (
          <button
            type="button"
            style={primaryBtnStyle}
            disabled={isStartingOAuth}
            onClick={() => void handleConnect()}
          >
            {isStartingOAuth && <Loader2 size={13} className="animate-spin" aria-hidden />}
            {needsReconnect ? 'Reconnect YouTube Account' : 'Connect YouTube Account'}
          </button>
        )}

        {connectError && (
          <p style={{ ...fineStyle, color: 'var(--color-down)', marginTop: 'var(--space-2)' }}>
            {connectError}
          </p>
        )}

        {!needsReconnect && (
          <p style={fineStyle}>
            Connect to unlock Retention Diagnosis — analyze where viewers drop off on your uploaded videos.
          </p>
        )}
      </div>
    )
  }

  // ── Connected — show Studio entry point ──────────────────────────────────
  return (
    <div style={{ ...cardStyle, borderColor: 'color-mix(in srgb, var(--accent) 35%, var(--color-border-base))' }}>
      <p style={headingStyle}>
        <CheckCircle2
          size={14}
          aria-hidden
          style={{ color: 'var(--color-up)', flexShrink: 0 }}
        />
        Connected
      </p>
      <p style={bodyStyle}>
        YouTube account linked. Retention Diagnosis is available on the Insights page.
      </p>
      {mode !== 'studio' ? (
        <button
          type="button"
          style={primaryBtnStyle}
          onClick={() => setMode('studio')}
        >
          Enter Studio
        </button>
      ) : (
        <div
          style={{
            textAlign: 'center',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-body)',
            color: 'var(--accent)',
            fontWeight: 600,
            padding: 'var(--space-2)',
          }}
        >
          Studio active
        </div>
      )}
      <p style={fineStyle}>
        Retention Diagnosis unlocked. Go to any channel's Insights page to analyze a video.
      </p>
    </div>
  )
}

const CHANNEL_RE = /^\/channels\/(\d+)(\/|$)/

function channelPath(channelDbId: string | undefined, leaf: string): string {
  return channelDbId ? `/channels/${channelDbId}/${leaf}` : `/${leaf}`
}

const NAV_ITEMS = [{ label: 'Channels', to: '/channels', icon: Grid2X2 }] as const

export function Sidebar() {
  const { pathname } = useLocation()
  const channelId = CHANNEL_RE.exec(pathname)?.[1]

  // Suppress unused-var warning — channelId will be used once channel-scoped
  // nav items are wired in a later prompt.
  void channelPath(channelId, '')

  return (
    <aside
      className="hidden flex-col lg:flex"
      style={{
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'var(--color-surface-0)',
        borderRight: '1px solid var(--color-border-subtle)',
        flexShrink: 0,
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo area — matches topbar height exactly */}
      <div
        className="flex shrink-0 items-center gap-3 px-5"
        style={{
          height: 'var(--header-height)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
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
          }}
        >
          SOCIALLENS
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            className="flex items-center gap-3 px-3 py-2 transition-interactive"
            style={({ isActive }: { isActive: boolean }) => ({
              borderRadius: 'var(--radius-md)',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              paddingLeft: 'calc(var(--space-3) - 2px)',
              background: isActive ? 'var(--color-surface-2)' : 'transparent',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              textDecoration: 'none',
            })}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <Icon
                  size={16}
                  aria-hidden
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: account connection card */}
      <div style={{ padding: 'var(--space-4)' }}>
        <AccountConnectionCard />
      </div>
    </aside>
  )
}
