import { NavLink } from 'react-router-dom'
import {
  BarChart2,
  Compass,
  LayoutDashboard,
  PlaySquare,
  TrendingUp,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Channels', to: '/channel', icon: BarChart2 },
  { label: 'Videos', to: '/videos', icon: PlaySquare },
  { label: 'Trends', to: '/trends', icon: TrendingUp },
  { label: 'Insights', to: '/insights', icon: Compass },
]

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-60 border-r bg-card/60 backdrop-blur lg:block">
      <div className="flex h-14 items-center px-5 text-lg font-semibold tracking-tight">
        SocialLens
      </div>
      <nav className="space-y-1 px-3 pb-6 pt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
