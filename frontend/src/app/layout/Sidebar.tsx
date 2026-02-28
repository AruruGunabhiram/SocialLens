import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart2,
  Compass,
  LayoutDashboard,
  PlaySquare,
  TrendingUp,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const CHANNEL_RE = /^\/channels\/(\d+)(\/|$)/

/** Returns an absolute channel-scoped path if channelDbId is known, else a global fallback. */
function channelPath(channelDbId: string | undefined, leaf: string): string {
  return channelDbId ? `/channels/${channelDbId}/${leaf}` : `/${leaf}`
}

export function Sidebar() {
  const { pathname } = useLocation()
  const channelId = CHANNEL_RE.exec(pathname)?.[1]

  const navItems = [
    { label: 'Dashboard', to: '/dashboard',                         icon: LayoutDashboard },
    { label: 'Channels',  to: '/channels',                          icon: BarChart2 },
    { label: 'Videos',    to: channelPath(channelId, 'videos'),     icon: PlaySquare },
    { label: 'Insights',  to: channelPath(channelId, 'insights'),   icon: Compass },
    { label: 'Trends',    to: channelPath(channelId, 'trends'),     icon: TrendingUp },
  ]

  return (
    <aside className="hidden min-h-screen w-60 border-r bg-card/60 backdrop-blur lg:block">
      <div className="flex h-14 items-center px-5 text-lg font-semibold tracking-tight">
        SocialLens
      </div>
      <nav className="space-y-1 px-3 pb-6 pt-2">
        {navItems.map((item) => (
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
      </nav>
    </aside>
  )
}
