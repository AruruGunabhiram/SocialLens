import { Suspense } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { useReduceMotion } from '@/lib/ReduceMotionContext'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'

function PageFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const { reduceMotion } = useReduceMotion()

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col bg-muted/10">
        <Topbar />
        <main className="flex-1 p-4 md:p-6">
          <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mx-auto max-w-6xl"
              >
                <Suspense fallback={<PageFallback />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </MotionConfig>
        </main>
      </div>
    </div>
  )
}
