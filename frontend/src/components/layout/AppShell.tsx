import { ReactNode } from 'react'

interface AppShellProps {
  title?: string
  children: ReactNode
}

export function AppShell({ title = 'SocialLens', children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">{title}</div>
          <div className="text-sm text-muted-foreground">Phase 7.1</div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  )
}
