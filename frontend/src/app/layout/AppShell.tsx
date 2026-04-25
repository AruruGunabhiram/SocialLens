import { Suspense, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { X, Youtube } from 'lucide-react'

import { useReduceMotion } from '@/lib/ReduceMotionContext'
import { useMode } from '@/lib/ModeContext'
import { KeyboardShortcutsProvider } from '@/lib/KeyboardShortcutsContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAccountStatus, useCurrentUser } from '@/features/account/queries'
import { fetchOAuthStartUrl } from '@/features/account/api'
import { CommandPalette } from '@/components/common/CommandPalette'
import { ShortcutsHelpModal } from '@/components/common/ShortcutsHelpModal'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'
import { CopilotPanel } from '@/components/layout/CopilotPanel'

// ─── Connection banner ────────────────────────────────────────────────────────

function ConnectBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const { data: currentUser } = useCurrentUser()
  const { data: accountStatus } = useAccountStatus(currentUser?.id)

  const connected = accountStatus?.connected ?? true // default true to avoid flash
  if (connected || dismissed) return null

  async function handleConnect() {
    if (!currentUser) return
    setIsStarting(true)
    try {
      const authUrl = await fetchOAuthStartUrl(currentUser.id)
      window.open(authUrl, '_blank', 'noopener,noreferrer')
    } catch {
      // intentionally silent  -  user can try via Topbar button
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div
      role="banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-5)',
        background: 'var(--color-amber-glow)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-amber-500) 25%, transparent)',
        position: 'relative',
      }}
    >
      <Youtube size={13} aria-hidden style={{ color: 'var(--color-amber-500)', flexShrink: 0 }} />
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-amber-500)',
          lineHeight: 1,
        }}
      >
        Connect your YouTube account to unlock private analytics
        <span
          aria-hidden
          style={{ margin: '0 var(--space-2)', color: 'var(--color-amber-600)', opacity: 0.5 }}
        >
          ·
        </span>
        <span style={{ opacity: 0.7 }}>
          Read-only access · We never post on your behalf · Disconnect anytime
        </span>
      </p>
      <button
        type="button"
        disabled={isStarting}
        onClick={() => void handleConnect()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: '2px var(--space-3)',
          background: 'color-mix(in srgb, var(--color-amber-500) 15%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-amber-500) 40%, transparent)',
          borderRadius: 'var(--radius-full)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--color-amber-500)',
          cursor: isStarting ? 'default' : 'pointer',
          opacity: isStarting ? 0.6 : 1,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Connect now
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          right: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-amber-500)',
          opacity: 0.6,
          borderRadius: 'var(--radius-sm)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  )
}

function PageFallback() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-32" style={{ borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    </div>
  )
}

// Inner shell that runs inside KeyboardShortcutsProvider (needs context)
function AppShellInner() {
  const location = useLocation()
  const { reduceMotion } = useReduceMotion()
  const { mode } = useMode()

  useKeyboardShortcuts()

  return (
    <div
      className={`mode-${mode} flex min-h-screen`}
      style={{ background: 'var(--color-canvas)', color: 'var(--color-text-primary)' }}
    >
      <Sidebar />

      <div
        className="flex min-h-screen flex-1 flex-col"
        style={{
          minWidth: 0,
          paddingRight: mode === 'studio' ? 'var(--copilot-panel-width)' : undefined,
          transition: 'padding-right var(--duration-slow) var(--ease-spring)',
        }}
      >
        <Topbar />
        <ConnectBanner />
        <main className="flex-1" style={{ padding: 'var(--section-gap)' }} id="main-content">
          <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}
              >
                <Suspense fallback={<PageFallback />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </MotionConfig>
        </main>
      </div>

      <AnimatePresence>{mode === 'studio' && <CopilotPanel />}</AnimatePresence>

      <CommandPalette />
      <ShortcutsHelpModal />
    </div>
  )
}

export function AppShell() {
  return (
    <KeyboardShortcutsProvider>
      <AppShellInner />
    </KeyboardShortcutsProvider>
  )
}
