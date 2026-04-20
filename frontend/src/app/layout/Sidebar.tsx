import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  Bot,
  LayoutDashboard,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  PlaySquare,
  RefreshCw,
  Settings,
  TrendingUp,
  Tv2,
} from 'lucide-react'
import { useAccountStatus, useCurrentUser } from '@/features/account/queries'
import { fetchOAuthStartUrl } from '@/features/account/api'

// ─── AccountStatusStrip ───────────────────────────────────────────────────────
//
// Compact bottom-of-sidebar account connection indicator.
// Connected  → green dot + "YouTube Connected"
// Needs reconnect → warning icon + "Reconnect required" + button
// Not connected → "Connect YouTube" button
// Loading/error  → subtle muted text

function AccountStatusStrip() {
  const { data: currentUser } = useCurrentUser()
  const { data: status, isLoading, isError, refetch } = useAccountStatus(currentUser?.id)
  const [isStartingOAuth, setIsStartingOAuth] = useState(false)
  const [oauthOpened, setOauthOpened] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const connected = status?.connected ?? false
  const accountStatus = status?.accountStatus
  const needsReconnect =
    !connected && (accountStatus === 'REFRESH_FAILED' || accountStatus === 'EXPIRED')

  async function handleConnect() {
    if (!currentUser) {
      setConnectError('Could not resolve your account.')
      return
    }
    setConnectError(null)
    setIsStartingOAuth(true)
    try {
      const authUrl = await fetchOAuthStartUrl(currentUser.id)
      window.open(authUrl, '_blank', 'noopener,noreferrer')
      setOauthOpened(true)
    } catch {
      setConnectError('Could not start sign-in.')
    } finally {
      setIsStartingOAuth(false)
    }
  }

  const stripBase: React.CSSProperties = {
    padding: 'var(--space-3) var(--space-4)',
    borderTop: '1px solid var(--color-border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    lineHeight: 1,
  }

  const connectBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    width: '100%',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-base)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    transition:
      'background var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard)',
    textAlign: 'left' as const,
  }

  if (isLoading) {
    return (
      <div style={stripBase}>
        <span style={{ ...labelStyle, color: 'var(--color-text-muted)' }}>
          Checking connection...
        </span>
      </div>
    )
  }

  if (isError) {
    return (
      <div style={stripBase}>
        <span style={{ ...labelStyle, color: 'var(--color-text-muted)' }}>
          Could not reach server
        </span>
        <button type="button" style={connectBtnStyle} onClick={() => void refetch()}>
          <RefreshCw size={12} aria-hidden />
          Retry
        </button>
      </div>
    )
  }

  if (connected) {
    return (
      <div style={stripBase}>
        <span style={labelStyle}>
          <span
            aria-hidden
            className="animate-pulse-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--color-up)',
              flexShrink: 0,
              boxShadow: '0 0 6px var(--color-up)',
            }}
          />
          YouTube Connected
        </span>
      </div>
    )
  }

  if (oauthOpened) {
    return (
      <div style={stripBase}>
        <span style={{ ...labelStyle, color: 'var(--color-text-muted)' }}>
          Complete sign-in in the new tab
        </span>
        <button type="button" style={connectBtnStyle} onClick={() => void refetch()}>
          <RefreshCw size={12} aria-hidden />
          Check status
        </button>
        <button
          type="button"
          style={{ ...connectBtnStyle, opacity: 0.6 }}
          onClick={() => {
            setOauthOpened(false)
            setConnectError(null)
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div style={stripBase}>
      {needsReconnect && (
        <span style={{ ...labelStyle, color: 'var(--color-warn)' }}>
          <AlertTriangle size={12} aria-hidden style={{ flexShrink: 0 }} />
          Token expired
        </span>
      )}
      <button
        type="button"
        style={connectBtnStyle}
        disabled={isStartingOAuth}
        onClick={() => void handleConnect()}
      >
        {isStartingOAuth ? (
          <Loader2 size={12} className="animate-spin" aria-hidden />
        ) : (
          <LinkIcon size={12} aria-hidden style={{ flexShrink: 0 }} />
        )}
        {needsReconnect ? 'Reconnect YouTube' : 'Connect YouTube'}
      </button>
      {connectError && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-down)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          {connectError}
        </span>
      )}
    </div>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Channels', to: '/channels', icon: Tv2 },
  { label: 'Videos', to: '/videos', icon: PlaySquare },
  { label: 'Trends', to: '/trends', icon: TrendingUp },
  { label: 'Insights', to: '/insights', icon: Lightbulb },
  { label: 'Copilot', to: '/copilot', icon: Bot },
] as const

const SECONDARY_NAV = [{ label: 'Settings', to: '/settings', icon: Settings }] as const

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string
  icon: React.ElementType
  label: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex items-center gap-3 px-3 py-2 transition-interactive"
      style={({ isActive }: { isActive: boolean }) => ({
        borderRadius: 'var(--radius-md)',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        paddingLeft: 'calc(var(--space-3) - 2px)',
        background: isActive ? 'var(--color-surface-2)' : 'transparent',
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-sm)',
        fontWeight: isActive ? 600 : 500,
        textDecoration: 'none',
      })}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <Icon
            size={15}
            aria-hidden
            style={{
              color: isActive ? 'var(--accent)' : 'var(--color-text-muted)',
              flexShrink: 0,
            }}
          />
          {label}
        </>
      )}
    </NavLink>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  // Keep location in scope so the sidebar can react to route changes
  // (NavLink handles active detection internally, but this prevents stale renders)
  useLocation()

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
      {/* ── Wordmark ── */}
      <div
        className="flex shrink-0 items-center gap-3 px-5"
        style={{
          height: 'var(--header-height)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <svg
          width="22"
          height="22"
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
          }}
        >
          SocialLens
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--color-neutral)',
            background: 'color-mix(in srgb, var(--color-neutral) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-neutral) 25%, transparent)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 6px',
            letterSpacing: 'var(--tracking-wide)',
            lineHeight: 1,
            alignSelf: 'center',
            textTransform: 'uppercase',
          }}
        >
          Beta
        </span>
      </div>

      {/* ── Primary nav ── */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-3">
        {PRIMARY_NAV.map(({ label, to, icon }) => (
          <NavItem key={to} to={to} icon={icon} label={label} end={to === '/'} />
        ))}

        {/* Divider */}
        <div
          aria-hidden
          style={{
            height: '1px',
            background: 'var(--color-border-subtle)',
            margin: 'var(--space-2) var(--space-1)',
          }}
        />

        {/* Secondary nav */}
        {SECONDARY_NAV.map(({ label, to, icon }) => (
          <NavItem key={to} to={to} icon={icon} label={label} />
        ))}
      </nav>

      {/* ── Account status ── */}
      <AccountStatusStrip />
    </aside>
  )
}
