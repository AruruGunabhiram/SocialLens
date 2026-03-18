import { Suspense } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

import { useReduceMotion } from '@/lib/ReduceMotionContext'
import { useMode } from '@/lib/ModeContext'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'
import { CopilotPanel } from '@/components/layout/CopilotPanel'

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

export function AppShell() {
  const location = useLocation()
  const { reduceMotion } = useReduceMotion()
  const { mode } = useMode()

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
    </div>
  )
}
