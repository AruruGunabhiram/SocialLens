import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart2,
  Compass,
  LayoutDashboard,
  PlaySquare,
  TrendingUp,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const CHANNEL_TRENDS_RE = /^\/channels\/(\d+)(\/|$)/

const staticNavItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Channels',  to: '/channels',  icon: BarChart2 },
  { label: 'Videos',    to: '/videos',    icon: PlaySquare },
  { label: 'Insights',  to: '/insights',  icon: Compass },
]

export function Sidebar() {
  const { pathname } = useLocation()

  // If the user is anywhere inside /channels/:id, link Trends directly there.
  const channelMatch = CHANNEL_TRENDS_RE.exec(pathname)
  const channelId = channelMatch?.[1]
  const trendsTo = channelId ? `/channels/${channelId}/trends` : '/trends'
  const trendsActive = /^\/channels\/[^/]+\/trends/.test(pathname) || pathname === '/trends'

  return (
    <aside className="hidden min-h-screen w-60 border-r bg-card/60 backdrop-blur lg:block">
      <div className="flex h-14 items-center px-5 text-lg font-semibold tracking-tight">
        SocialLens
      </div>
      <nav className="space-y-1 px-3 pb-6 pt-2">
        {staticNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}

        {/* Trends — destination depends on whether a channel is in the current URL */}
        <NavLink
          to={trendsTo}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            trendsActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <TrendingUp className="h-4 w-4" aria-hidden />
          Trends
        </NavLink>
      </nav>
    </aside>
  )
}
