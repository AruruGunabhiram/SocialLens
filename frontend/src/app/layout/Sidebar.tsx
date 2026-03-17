import { NavLink, useLocation } from 'react-router-dom'
import { GitBranch, Grid2X2, Search, TrendingUp } from 'lucide-react'

const CHANNEL_RE = /^\/channels\/(\d+)(\/|$)/

function channelPath(channelDbId: string | undefined, leaf: string): string {
  return channelDbId ? `/channels/${channelDbId}/${leaf}` : `/${leaf}`
}

const NAV_ITEMS = [
  { label: 'Overview', to: '/dashboard', icon: Grid2X2 },
  { label: 'Search Channels', to: '/channels', icon: Search },
  { label: 'Trending', to: '/trends', icon: TrendingUp },
  { label: 'Compare', to: '/compare', icon: GitBranch },
] as const

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
          CIPHER
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

      {/* Bottom: Unlock Studio CTA */}
      <div style={{ padding: 'var(--space-4)' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-surface-2), var(--color-surface-1))',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Unlock Studio
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-3)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            Connect your channel for owner-only insights
          </p>
          <button
            type="button"
            className="w-full"
            style={{
              background: 'var(--color-amber-500)',
              color: 'var(--color-text-inverse)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              cursor: 'pointer',
              transition: 'opacity var(--duration-base) var(--ease-standard)',
            }}
          >
            Connect with YouTube
          </button>
        </div>
      </div>
    </aside>
  )
}
